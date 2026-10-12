import { expect, test } from '@playwright/test';
import { addDays, formatShortDate, todayIn } from '../../src/lib/local-date';
import { OWNER } from './support/config';

// 육아 모듈 흐름 (docs/modules/childcare.md): 아이 등록 → 준비물 → 일정 → 태어났어요 → 생년월일 수정.
// 같은 DB 상태를 이어서 쓰므로 순서대로 실행한다.
test.describe.configure({ mode: 'serial' });

const today = todayIn('Asia/Seoul');
const TWO_MONTH_SHOTS = 'DTaP 1차 · IPV(폴리오) 1차 · Hib 1차 · 폐렴구균 1차 · 로타바이러스 1차';

test('아이를 등록하면 출산까지 D-day와 임신 주수를 보여 준다', async ({ page }) => {
  await page.goto('/childcare');
  await expect(page.getByRole('heading', { name: '아이를 등록해 주세요' })).toBeVisible();

  await page.getByRole('button', { name: '등록' }).click();
  await expect(page.getByText('이름이나 태명을 써 주세요.')).toBeVisible();
  await expect(page.getByText('출산 예정일을 넣어 주세요.')).toBeVisible();

  await page.getByLabel('태명').fill('콩이');
  await page.getByLabel('출산 예정일').fill(addDays(today, 152));
  await page.getByRole('button', { name: '등록' }).click();

  // 40주 - 152일 = 18주 2일
  const card = page.getByRole('region', { name: '콩이' });
  await expect(card).toContainText('D-152');
  await expect(card).toContainText('임신 18주 2일');
  await expect(page.getByRole('region', { name: '출산 준비' })).toContainText('아직 없어요');
});

test('추천 준비물을 골라 등록하고, 체크하면 누가 했는지 보인다', async ({ page }) => {
  await page.goto('/childcare/prep');
  await page.getByRole('link', { name: '추천 준비물 고르기' }).click();
  await page.getByRole('checkbox', { name: '유축기' }).uncheck();
  await page.getByRole('button', { name: '고른 준비물 등록' }).click();

  await expect(page).toHaveURL(/\/childcare\/prep$/);
  const progress = page.getByRole('region', { name: '출산 준비' });
  await expect(progress).toContainText('0 / 46');
  await expect(page.getByRole('checkbox', { name: '유축기' })).toHaveCount(0);

  await page.getByRole('checkbox', { name: '젖병 4개' }).check();
  await expect(progress).toContainText('1 / 46');
  await expect(page.getByRole('region', { name: '수유' })).toContainText(OWNER.name);

  // 추천 목록에 없는 것도 넣을 수 있다
  await page.getByRole('button', { name: '추가', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '준비물 추가' });
  await dialog.getByLabel('이름').fill('아기 모빌');
  await dialog.getByLabel('카테고리').selectOption('의류 · 침구');
  await dialog.getByRole('button', { name: '추가' }).click();
  await expect(page.getByRole('region', { name: '의류 · 침구' })).toContainText('아기 모빌');
  await expect(progress).toContainText('1 / 47');

  // 이미 있는 것은 다시 고를 수 없다
  await page.getByRole('link', { name: '추천 목록에서 더 고르기' }).click();
  await expect(page.getByRole('checkbox', { name: /^젖병 4개/ })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: '유축기' })).toBeChecked();
});

test('출산 전 일정을 넣으면 오늘 화면에도 보인다', async ({ page }) => {
  await page.goto('/childcare/schedule');
  await page.getByRole('button', { name: '일정 넣기' }).click();
  const dialog = page.getByRole('dialog', { name: '일정 넣기' });
  await expect(dialog.getByRole('radio', { name: /산부인과/ })).toBeChecked();
  await dialog.getByLabel('일정 이름').fill('정기검진');
  await dialog.getByLabel('날짜').fill(addDays(today, 8));
  await dialog.getByLabel('시각 (선택)').fill('14:30');
  await dialog.getByLabel('장소 (선택)').fill('우리여성병원');
  await dialog.getByRole('button', { name: '넣기' }).click();
  await expect(page.getByText('정기검진 일정을 넣었어요.')).toBeVisible();

  const row = page.getByRole('listitem', { name: '정기검진' });
  await expect(row).toContainText('8일 뒤');
  await expect(row).toContainText('오후 2:30 · 우리여성병원');

  await page.goto('/childcare');
  await expect(page.getByRole('region', { name: '챙길 일정' })).toContainText('정기검진');
});

test('태어났어요를 누르면 생년월일로 접종 · 검진 · 행정 일정이 생긴다', async ({ page }) => {
  await page.goto('/childcare');
  await page.getByRole('link', { name: '태어났어요 🎉' }).click();
  await page.getByLabel('이름').fill('하늘');
  await page.getByLabel('태어난 날').fill(addDays(today, -70));
  await page.getByLabel('출생 몸무게 kg (선택)').fill('3.25');
  await page.getByLabel('출생 키 cm (선택)').fill('50.5');
  await page.getByRole('button', { name: '태어났어요 🎉' }).click();

  const card = page.getByRole('region', { name: '하늘' });
  await expect(card).toContainText('생후 70일');
  await expect(card).toContainText('3.25kg · 50.5cm');
  await expect(card).toContainText('100일까지 D-29');

  // 생후 70일: BCG · 출생신고는 기한이 지났고, 2개월 접종은 지금 할 때 (같은 기간이라 한 줄)
  await page.getByRole('link', { name: '일정', exact: true }).click();
  const missed = page.getByRole('region', { name: '놓친 일정' });
  await expect(missed.getByRole('listitem', { name: 'BCG (결핵)' })).toContainText('놓침');
  await expect(missed.getByRole('listitem', { name: '출생신고' })).toBeVisible();
  const due = page.getByRole('region', { name: '지금 할 일정' });
  await expect(due.getByRole('listitem', { name: TWO_MONTH_SHOTS })).toBeVisible();

  // 같이 맞힌 것만 골라 기록한다 (로타는 빼고)
  await due.getByRole('button', { name: `${TWO_MONTH_SHOTS} 했어요` }).click();
  let dialog = page.getByRole('dialog', { name: '했어요' });
  await dialog.getByRole('checkbox', { name: '로타바이러스 1차' }).uncheck();
  await dialog.getByLabel('장소 (선택)').fill('우리소아과');
  await dialog.getByRole('button', { name: '기록' }).click();
  await expect(page.getByText('4개를 했다고 기록했어요.')).toBeVisible();
  await expect(due.getByRole('listitem', { name: '로타바이러스 1차' })).toBeVisible();

  // 맞히지 않을 표준 일정은 해당 없음으로 숨기고, 지난 일정에서 되살린다
  await due.getByRole('button', { name: '로타바이러스 1차 했어요' }).click();
  dialog = page.getByRole('dialog', { name: '했어요' });
  await dialog.getByRole('button', { name: '해당 없음' }).click();
  await expect(page.getByText(/해당 없음으로 숨겼어요/)).toBeVisible();
  await expect(page.getByRole('listitem', { name: '로타바이러스 1차' })).toHaveCount(0);

  await page.getByRole('link', { name: /^지난 일정/ }).click();
  const done = page.getByRole('region', { name: '한 일정' });
  await expect(done.getByRole('listitem', { name: 'DTaP 1차' })).toContainText(
    `${formatShortDate(today)} · 우리소아과 · ${OWNER.name}`,
  );
  await page.getByRole('button', { name: '로타바이러스 1차 되살리기' }).click();
  await expect(page.getByText('일정을 되살렸어요.')).toBeVisible();
  await expect(page.getByRole('region', { name: '해당 없음' })).toHaveCount(0);
});

test('생년월일을 고치면 아직 안 한 일정만 다시 계산한다', async ({ page }) => {
  const birthDate = addDays(today, -60);
  await page.goto('/childcare');
  await page.getByRole('link', { name: '하늘 정보 고치기' }).click();
  await page.getByLabel('태어난 날').fill(birthDate);
  await page.getByRole('button', { name: '저장' }).click();
  const card = page.getByRole('region', { name: '하늘' });
  await expect(card).toContainText('생후 60일');
  // 출생 몸무게 · 키도 새 생년월일로 옮겨진다
  await expect(card).toContainText('3.25kg · 50.5cm');

  await page.goto('/childcare/schedule');
  await expect(page.getByRole('listitem', { name: '100일' })).toContainText(
    formatShortDate(addDays(birthDate, 99)),
  );
  // 이미 한 접종은 그대로
  await page.goto('/childcare/schedule?view=past');
  await expect(
    page.getByRole('region', { name: '한 일정' }).getByRole('listitem', { name: 'DTaP 1차' }),
  ).toContainText(formatShortDate(today));
});

test('기저귀 · 분유는 몇 번의 탭으로 기록하고, 마지막 수유 · 하루 합계에 바로 보인다', async ({
  page,
}) => {
  await page.goto('/childcare');
  await page.getByRole('button', { name: '기저귀', exact: true }).click();
  await page
    .getByRole('dialog', { name: /기저귀 기록/ })
    .getByRole('button', { name: '대변' })
    .click();
  await expect(page.getByText('대변 기록했어요.')).toBeVisible();
  await expect(page.getByLabel('마지막 대변')).toContainText('오늘');

  await page.getByRole('button', { name: '수유', exact: true }).click();
  const feeding = page.getByRole('dialog', { name: /수유 기록/ });
  await feeding.getByRole('radio', { name: '분유', exact: true }).check();
  await feeding.getByRole('button', { name: '120ml' }).click();
  await expect(page.getByText('분유 120ml 기록했어요.')).toBeVisible();
  await expect(page.getByLabel('마지막 수유')).toContainText('분유 120ml');

  const totals = page.getByRole('list', { name: '하루 합계' });
  await expect(totals).toContainText('수유 1회 (분유 120ml)');
  await expect(totals).toContainText('기저귀 소변 0 · 대변 1');

  // 잘못 넣었으면 토스트의 [취소]로 바로 지운다
  await page.goto('/childcare');
  await page.getByRole('button', { name: '체온', exact: true }).click();
  const temperature = page.getByRole('dialog', { name: /체온 기록/ });
  await temperature.getByLabel('체온 (℃)').fill('37.8');
  await temperature.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('listitem', { name: '체온 37.8℃' })).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page.getByText('기록을 취소했어요.')).toBeVisible();
  await expect(page.getByRole('listitem', { name: '체온 37.8℃' })).toHaveCount(0);
});

test('재우기 타이머를 [깼어요]로 끝내고, 시각을 고치면 그날 합계에 들어간다', async ({ page }) => {
  await page.goto('/childcare');
  await page.getByRole('button', { name: '재우기', exact: true }).click();
  const running = page.getByRole('region', { name: '진행 중' });
  await expect(running).toContainText('자는 중');
  // 자는 중에 또 누르면 안내만 한다
  await page.getByRole('button', { name: '재우기', exact: true }).click();
  await expect(page.getByText(/이미 자는 중이에요/)).toBeVisible();

  await running.getByRole('button', { name: '깼어요' }).click();
  await expect(page.getByRole('region', { name: '진행 중' })).toHaveCount(0);

  // 어제 13:00 ~ 14:30으로 고치면 어제 기록이 된다
  const yesterday = addDays(today, -1);
  await page.getByRole('button', { name: /수면 0분 고치기$/ }).click();
  const edit = page.getByRole('dialog', { name: /수면 기록 고치기/ });
  await edit.getByLabel('시작 시각').fill(`${yesterday}T13:00`);
  await edit.getByLabel('끝 시각').fill(`${yesterday}T14:30`);
  await edit.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('기록을 고쳤어요.')).toBeVisible();

  await page.getByRole('link', { name: '전날' }).click();
  await expect(page.getByRole('heading', { name: formatShortDate(yesterday) })).toBeVisible();
  await expect(page.getByRole('list', { name: '하루 합계' })).toContainText('수면 1시간 30분');
  await expect(page.getByRole('listitem', { name: '수면 1시간 30분' })).toBeVisible();
});

test('모유는 다음에 먹일 쪽을 알려 주고, 다음 수유 창에서 그쪽을 골라 둔다', async ({ page }) => {
  await page.goto('/childcare');
  await page.getByRole('button', { name: '수유', exact: true }).click();
  let feeding = page.getByRole('dialog', { name: /수유 기록/ });
  await feeding.getByRole('radio', { name: '모유', exact: true }).check();
  await feeding.getByRole('radio', { name: '왼쪽' }).check();
  await feeding.getByLabel('몇 분 먹였어요? (선택)').fill('15');
  await feeding.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('모유 왼쪽 15분 기록했어요.')).toBeVisible();
  await expect(page.getByLabel('마지막 수유')).toContainText('다음은 오른쪽');

  await page.getByRole('button', { name: '수유', exact: true }).click();
  feeding = page.getByRole('dialog', { name: /수유 기록/ });
  await feeding.getByRole('radio', { name: '모유', exact: true }).check();
  await expect(feeding.getByRole('radio', { name: '오른쪽' })).toBeChecked();
  // 분을 비워 두면 타이머로 시작한다
  await feeding.getByRole('button', { name: '타이머 시작' }).click();
  const running = page.getByRole('region', { name: '진행 중' });
  await expect(running).toContainText('모유 오른쪽 먹는 중');
  await running.getByRole('button', { name: '끝' }).click();
  await expect(page.getByRole('region', { name: '진행 중' })).toHaveCount(0);
  await expect(page.getByLabel('마지막 수유')).toContainText('다음은 왼쪽');
});

test('키 · 몸무게를 남기면 늘어난 양과 그래프가, 발달 기록은 생후 날짜와 함께 보인다', async ({
  page,
}) => {
  await page.goto('/childcare/growth');
  const records = page.getByRole('list', { name: '측정 기록' });
  await expect(records.getByRole('listitem')).toHaveCount(1);
  await expect(records).toContainText('생후 0일 · 출생');

  await page.getByRole('button', { name: '측정 추가' }).click();
  const measurement = page.getByRole('dialog', { name: '측정 기록' });
  await measurement.getByRole('button', { name: '저장' }).click();
  await expect(
    measurement.getByText('몸무게 · 키 · 머리둘레 중 하나 이상 써 주세요.'),
  ).toBeVisible();
  await measurement.getByLabel('몸무게 kg').fill('5.1');
  await measurement.getByLabel('키 cm').fill('58.2');
  await measurement.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('측정 기록을 남겼어요.')).toBeVisible();

  const latest = records.getByRole('listitem').first();
  await expect(latest).toContainText('+1.85');
  await expect(latest).toContainText('+7.7');
  await expect(page.getByRole('img', { name: /몸무게 3\.25kg에서 5\.1kg로/ })).toBeVisible();

  await page.getByRole('button', { name: '발달 기록 추가' }).click();
  const milestone = page.getByRole('dialog', { name: '발달 기록' });
  await milestone.getByRole('button', { name: '첫 미소' }).click();
  await expect(milestone.getByLabel('무엇을 했나요?')).toHaveValue('첫 미소');
  await milestone.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('첫 미소 기록을 남겼어요.')).toBeVisible();
  await expect(
    page.getByRole('list', { name: '발달 기록' }).getByRole('listitem', { name: '첫 미소' }),
  ).toContainText(/생후 [12]개월/);
});
