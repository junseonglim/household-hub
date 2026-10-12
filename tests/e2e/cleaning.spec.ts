import { expect, test, type Page } from '@playwright/test';
import { addDays, formatShortDate, todayIn } from '../../src/lib/local-date';
import { OWNER } from './support/config';

// 청소 모듈 흐름 (docs/modules/cleaning.md). 같은 DB 상태를 이어서 쓰므로 순서대로 실행한다.
// 예정일은 실행하는 날에 따라 달라지므로, 가구 시간대의 오늘을 기준으로 기대값을 계산한다.
test.describe.configure({ mode: 'serial' });

const today = todayIn('Asia/Seoul');
const section = (page: Page, title: string) =>
  page.getByRole('region', { name: new RegExp(`^${title} \\d+$`) });

test('할 일이 없으면 추천 할 일을 골라 한 번에 등록할 수 있다', async ({ page }) => {
  await page.goto('/cleaning');
  await expect(page.getByText('아직 등록한 할 일이 없어요')).toBeVisible();
  await page.getByRole('link', { name: '추천 할 일 고르기' }).click();

  await expect(page.getByRole('heading', { level: 1, name: '추천 할 일' })).toBeVisible();
  // 분리수거는 배출 요일 없이 7일마다가 기본
  await expect(page.getByText('🪴 베란다 · 7일마다')).toBeVisible();
  await page.getByRole('checkbox', { name: '세탁기 통세척' }).uncheck();
  await page.getByRole('button', { name: '고른 할 일 등록' }).click();

  await expect(page).toHaveURL(/\/cleaning$/);
  const todaySection = section(page, '오늘');
  await expect(todaySection.getByRole('listitem', { name: '설거지 · 싱크대 정리' })).toBeVisible();
  await expect(todaySection.getByRole('listitem', { name: '빨래 돌리기 · 널기' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: '세탁기 통세척' })).toHaveCount(0);

  // 다시 들어가면 이미 등록한 것은 '이미 있음'으로 선택이 풀려 있다
  await page.getByRole('link', { name: '추천 할 일 더 고르기' }).click();
  await expect(page.getByRole('checkbox', { name: /^설거지 · 싱크대 정리/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: '세탁기 통세척' })).toBeChecked();
});

test('한 번 탭으로 완료하고, 잘못 눌렀으면 바로 취소할 수 있다', async ({ page }) => {
  await page.goto('/cleaning');
  const todaySection = section(page, '오늘');
  const dishes = '설거지 · 싱크대 정리';

  await page.getByRole('button', { name: `${dishes} 완료`, exact: true }).click();
  await expect(page.getByText('완료! 다음: 내일')).toBeVisible();
  await expect(todaySection.getByRole('listitem', { name: dishes })).toHaveCount(0);
  await expect(section(page, '이번 주').getByRole('listitem', { name: dishes })).toBeVisible();

  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByText(`'${dishes}' 완료를 취소했어요.`)).toBeVisible();
  await expect(todaySection.getByRole('listitem', { name: dishes })).toBeVisible();
});

const WINDOW_TASK = '베란다 창틀 닦기';

test('할 일을 등록하면 다음 예정일을 미리 보여 주고, 목록에 나타난다', async ({ page }) => {
  await page.goto('/cleaning');
  await page.getByRole('link', { name: '할 일 추가' }).click();

  await page.getByRole('radio', { name: 'N일마다' }).check();
  await page.getByLabel('며칠마다').fill('3');
  await expect(
    page.getByText(
      `다음 예정일: ${[0, 3, 6].map((days) => formatShortDate(addDays(today, days))).join(', ')}`,
    ),
  ).toBeVisible();

  // 이름을 빠뜨리면 오류를 보여 주고, 고른 반복은 그대로 남는다
  await page.getByRole('button', { name: '등록' }).click();
  await expect(page.getByText('할 일 이름을 입력해 주세요.')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'N일마다' })).toBeChecked();
  await expect(page.getByLabel('며칠마다')).toHaveValue('3');

  await page.getByLabel('할 일', { exact: true }).fill(WINDOW_TASK);
  await page.getByRole('radio', { name: '베란다' }).check();
  await page.getByLabel('담당').selectOption({ label: OWNER.name });
  await page.getByRole('button', { name: '등록' }).click();

  await expect(page).toHaveURL(/\/cleaning$/);
  const row = section(page, '오늘').getByRole('listitem', { name: WINDOW_TASK });
  await expect(row).toContainText('베란다 · 3일마다');
  await expect(row).toContainText(OWNER.name);

  // 내 담당: 나에게 맡겨진 일 + 누구나 할 수 있는 일
  await page.getByRole('link', { name: '내 담당' }).click();
  await expect(page).toHaveURL(/view=mine/);
  await expect(page.getByRole('listitem', { name: WINDOW_TASK })).toBeVisible();
  await expect(page.getByRole('listitem', { name: '설거지 · 싱크대 정리' })).toBeVisible();
});

test('지난 시각으로 완료를 기록하면 그날부터 다음 예정일을 센다', async ({ page }) => {
  await page.goto('/cleaning');
  await page.getByRole('button', { name: `${WINDOW_TASK} 자세히 기록` }).click();

  const dialog = page.getByRole('dialog', { name: '완료 기록하기' });
  await dialog.getByLabel('완료 시각').fill(`${addDays(today, -1)}T20:00`);
  await dialog.getByLabel('메모 (선택)').fill('방충망도 같이');
  await dialog.getByRole('button', { name: '완료 기록' }).click();

  // 어제 했으니 3일마다 → 오늘부터 이틀 뒤
  await expect(page.getByText(`완료! 다음: ${formatShortDate(addDays(today, 2))}`)).toBeVisible();
  await expect(dialog).toHaveCount(0);

  await page.getByRole('link', { name: WINDOW_TASK }).click();
  await expect(page.getByRole('heading', { level: 1, name: WINDOW_TASK })).toBeVisible();
  const summary = page.getByRole('region', { name: '요약' });
  await expect(summary).toContainText('어제');
  await expect(summary).toContainText(`${formatShortDate(addDays(today, 2))} · 2일 뒤`);
  const history = page.getByRole('region', { name: '완료 기록' });
  await expect(history).toContainText('방충망도 같이');
  await expect(history).toContainText(`${formatShortDate(addDays(today, -1))} 오후 8:00`);
});

test('반복 규칙을 바꾸면 다음 예정일을 다시 계산한다', async ({ page }) => {
  await page.goto('/cleaning');
  await page.getByRole('link', { name: WINDOW_TASK }).click();
  await page.getByRole('link', { name: '수정' }).click();

  await page.getByRole('radio', { name: '매일' }).check();
  await expect(page.getByText(`다음 예정일: ${formatShortDate(today)}`)).toBeVisible();
  await page.getByRole('button', { name: '저장' }).click();

  const summary = page.getByRole('region', { name: '요약' });
  await expect(summary).toContainText('매일');
  await expect(summary).toContainText(`${formatShortDate(today)} · 오늘`);
});

test('마지막 완료를 취소하면 예정일이 그 전으로 돌아간다', async ({ page }) => {
  await page.goto('/cleaning');
  await page.getByRole('link', { name: WINDOW_TASK }).click();
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.getByText('완료! 다음: 내일')).toBeVisible();

  const history = page.getByRole('region', { name: '완료 기록' });
  await expect(history.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: '마지막 완료 취소' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '완료 취소' }).click();

  await expect(history.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('region', { name: '요약' })).toContainText(
    `${formatShortDate(today)} · 오늘`,
  );
});

test('보관하면 목록에서 사라진다', async ({ page }) => {
  await page.goto('/cleaning');
  await page.getByRole('link', { name: WINDOW_TASK }).click();
  await page.getByRole('button', { name: '이 할 일 보관' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '보관' }).click();

  await expect(page).toHaveURL(/\/cleaning$/);
  await expect(page.getByRole('listitem', { name: WINDOW_TASK })).toHaveCount(0);
});

test('공간별로 보고, 관리자는 공간을 추가 · 보관할 수 있다', async ({ page }) => {
  await page.goto('/cleaning');
  await page
    .getByRole('navigation', { name: '청소 보기' })
    .getByRole('link', { name: '공간별' })
    .click();
  await expect(page).toHaveURL(/\/cleaning\/spaces$/);
  await expect(page.getByRole('link', { name: '욕실 공간' })).toContainText('화장실 청소');

  await page.getByRole('link', { name: '욕실 공간' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '🛁 욕실' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: '화장실 청소' })).toBeVisible();

  await page.goto('/cleaning/spaces/manage');
  await page.getByLabel('새 공간 아이콘 (이모지)').fill('📚');
  await page.getByLabel('새 공간 이름').fill('서재');
  await page.getByRole('button', { name: '추가' }).click();
  await expect(page.getByText("'서재' 공간을 추가했어요.")).toBeVisible();

  // 같은 이름은 또 만들 수 없다
  await page.getByLabel('새 공간 이름').fill('서재');
  await page.getByRole('button', { name: '추가' }).click();
  await expect(page.getByText("'서재' 공간이 이미 있어요.")).toBeVisible();

  const study = page.getByRole('listitem', { name: '서재' });
  await study.getByRole('button', { name: '보관' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '보관' }).click();
  await expect(study).toHaveCount(0);
});
