import { expect, test, type Browser } from '@playwright/test';
import { expectPendingScreen, logIn, signUp } from './support/auth-helpers';
import { OWNER, OWNER_STATE } from './support/config';

// 가입 · 승인 · 거절 · 비밀번호 초기화 흐름 (docs/05-auth-household.md 4절)
// 같은 DB 상태를 이어서 쓰므로 순서대로 실행한다.
test.describe.configure({ mode: 'serial' });

const DAD = { name: '김아빠', email: 'dad@example.com', password: 'dad-password-1' };
const STRANGER = { name: '모르는사람', email: 'stranger@example.com', password: 'stranger-pw-1' };

async function ownerPage(browser: Browser) {
  const context = await browser.newContext({ storageState: OWNER_STATE });
  return context.newPage();
}

test('로그인하지 않으면 로그인 화면으로 가고, 로그인하면 원래 화면으로 돌아온다', async ({
  page,
}) => {
  await page.goto('/cooking');
  await expect(page).toHaveURL(/\/login\?next=%2Fcooking$/);

  await logIn(page, OWNER.email, 'wrong-password');
  await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않아요.')).toBeVisible();
  // 오류가 나도 입력한 이메일은 남아 있다
  await expect(page.getByLabel('이메일')).toHaveValue(OWNER.email);

  await logIn(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/cooking$/);
});

test('가입 입력이 틀리면 칸마다 오류를 보여 준다', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('이메일').fill('not-an-email');
  await page.getByLabel('비밀번호', { exact: true }).fill('short');
  await page.getByRole('button', { name: '가입하기' }).click();

  await expect(page.getByText('이름을 입력해 주세요.')).toBeVisible();
  await expect(page.getByText('이메일 주소를 확인해 주세요.')).toBeVisible();
  await expect(page.getByText('비밀번호는 8자 이상이어야 해요.')).toBeVisible();
});

test('두 번째 가입자는 승인 대기였다가, 관리자가 승인하면 들어올 수 있다', async ({
  page,
  browser,
}) => {
  await signUp(page, DAD);
  await expectPendingScreen(page);
  // 승인 전에는 다른 화면에 들어갈 수 없다
  await page.goto('/cleaning');
  await expectPendingScreen(page);

  const owner = await ownerPage(browser);
  await owner.goto('/cleaning');
  await expect(owner.getByText('가입 승인을 기다리는 사람이 1명 있어요')).toBeVisible();
  await owner.getByRole('link', { name: '확인하기' }).click();

  const request = owner.getByRole('region', { name: `${DAD.name}님의 가입 요청` });
  await expect(request).toContainText(DAD.email);
  await request.getByLabel('호칭').fill('아빠');
  await request.getByLabel('역할').selectOption('admin');
  await request.getByRole('button', { name: '승인' }).click();

  await expect(owner.getByRole('listitem', { name: '아빠' })).toContainText('관리자');
  await expect(owner.getByText('가입 승인을 기다리는 사람이')).toHaveCount(0);

  await page.getByRole('link', { name: '승인됐는지 확인하기' }).click();
  await expect(page).toHaveURL(/\/cleaning$/);
  await owner.context().close();
});

test('모르는 사람의 가입은 거절할 수 있고, 거절된 계정은 로그인할 수 없다', async ({
  page,
  browser,
}) => {
  await signUp(page, STRANGER);
  await expectPendingScreen(page);

  const owner = await ownerPage(browser);
  await owner.goto('/settings/household');
  const request = owner.getByRole('region', { name: `${STRANGER.name}님의 가입 요청` });
  await request.getByRole('button', { name: '거절' }).click();
  await owner.getByRole('button', { name: '거절하고 삭제' }).click();
  await expect(request).toHaveCount(0);
  await owner.context().close();

  // 계정이 지워져 세션도 사라졌다
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await logIn(page, STRANGER.email, STRANGER.password);
  await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않아요.')).toBeVisible();
});

test('비밀번호를 잊은 가족에게 임시 비밀번호를 만들어 줄 수 있다', async ({ page, browser }) => {
  await page.goto('/login');
  await logIn(page, DAD.email, DAD.password);
  await expect(page).toHaveURL(/\/$|\/cleaning$/);

  const owner = await ownerPage(browser);
  await owner.goto('/settings/household');
  const dadRow = owner.getByRole('listitem', { name: '아빠' });
  await dadRow.getByRole('button', { name: '비밀번호 초기화' }).click();
  await owner.getByRole('button', { name: '초기화', exact: true }).click();
  const tempPassword = (await dadRow.getByTestId('temp-password').textContent())?.trim() ?? '';
  expect(tempPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  await owner.context().close();

  // 초기화하면 기존 로그인이 끊긴다
  await page.reload();
  await expect(page).toHaveURL(/\/login/);

  // 예전 비밀번호는 더 이상 안 되고, 임시 비밀번호로 로그인하면 비밀번호 변경 화면으로 간다
  await logIn(page, DAD.email, DAD.password);
  await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않아요.')).toBeVisible();
  await logIn(page, DAD.email, tempPassword);
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(page.getByText('임시 비밀번호로 로그인했어요')).toBeVisible();

  // 다른 기기에서도 로그인해 둔다 → 비밀번호를 바꾸면 그쪽은 로그아웃돼야 한다
  const otherDevice = await (await browser.newContext()).newPage();
  await otherDevice.goto('/login');
  await logIn(otherDevice, DAD.email, tempPassword);
  await expect(otherDevice).toHaveURL(/\/settings\/profile$/);

  await page.getByLabel('현재 비밀번호').fill(tempPassword);
  await page.getByLabel('새 비밀번호', { exact: true }).fill('dad-new-password');
  await page.getByLabel('새 비밀번호 확인').fill('dad-new-password');
  await page.getByRole('button', { name: '비밀번호 바꾸기' }).click();
  await expect(page.getByText('비밀번호를 바꿨어요.', { exact: false })).toBeVisible();
  await expect(page.getByText('임시 비밀번호로 로그인했어요')).toHaveCount(0);

  // 바꾼 기기는 로그인 상태 그대로, 다른 기기는 로그아웃
  await page.goto('/cleaning');
  await expect(page).toHaveURL(/\/cleaning$/);
  await otherDevice.reload();
  await expect(otherDevice).toHaveURL(/\/login/);
  await otherDevice.context().close();
});

test('로그아웃하면 다시 로그인해야 한다', async ({ page }) => {
  await page.goto('/login');
  await logIn(page, DAD.email, 'dad-new-password');
  await expect(page).toHaveURL(/\/cleaning$/);

  await page.goto('/settings');
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login/);
});

test('일반 구성원은 가입 승인 · 구성원 관리 화면을 볼 수 없다', async ({ page, browser }) => {
  const GRANDMA = { name: '할머니', email: 'grandma@example.com', password: 'grandma-pw-1' };
  await signUp(page, GRANDMA);
  await expectPendingScreen(page);

  const owner = await ownerPage(browser);
  await owner.goto('/settings/household');
  await owner
    .getByRole('region', { name: `${GRANDMA.name}님의 가입 요청` })
    .getByRole('button', { name: '승인' })
    .click();
  await expect(owner.getByRole('listitem', { name: GRANDMA.name })).toContainText('구성원');
  await owner.context().close();

  await page.goto('/settings/household');
  await expect(page.getByRole('heading', { name: '우리집 구성원' })).toBeVisible();
  await expect(page.getByLabel('가구 이름')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '비밀번호 초기화' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내보내기' })).toHaveCount(0);
});
