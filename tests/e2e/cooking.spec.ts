import { expect, test, type Page } from '@playwright/test';
import { formatShortDate, todayIn } from '../../src/lib/local-date';

// 요리 모듈 흐름 (docs/modules/cooking.md): 레시피 → 주간 식단 → 장보기.
// 같은 DB 상태를 이어서 쓰므로 순서대로 실행한다.
test.describe.configure({ mode: 'serial' });

const today = todayIn('Asia/Seoul');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 식단의 날짜 카드 (오늘이면 '오늘' 배지가 붙는다) */
const dayCard = (page: Page, date: string) =>
  page.getByRole('region', { name: new RegExp(`^${escapeRegExp(formatShortDate(date))}`) });

async function createRecipe(
  page: Page,
  recipe: { title: string; tag?: string; ingredients: string; steps: string },
) {
  await page.goto('/cooking/recipes/new');
  await page.getByLabel('요리 이름').fill(recipe.title);
  if (recipe.tag) await page.getByRole('checkbox', { name: recipe.tag }).check();
  await page.getByLabel('재료', { exact: true }).fill(recipe.ingredients);
  await page.getByLabel('조리 순서').fill(recipe.steps);
  await page.getByRole('button', { name: '등록' }).click();
  await expect(page.getByRole('heading', { level: 1, name: recipe.title })).toBeVisible();
}

test('레시피를 등록하면 재료를 나눠 보여 주고, 이름 · 재료 · 태그로 찾을 수 있다', async ({
  page,
}) => {
  await page.goto('/cooking/recipes');
  await expect(page.getByText('아직 레시피가 없어요')).toBeVisible();
  await page.getByRole('link', { name: '레시피 추가' }).click();

  // 이름을 빠뜨려도 써 둔 재료 · 태그는 그대로 남는다
  await page.getByRole('checkbox', { name: '국·찌개' }).check();
  await page.getByLabel('재료', { exact: true }).fill('된장 2큰술\n양파 1/2개\n두부 한 모');
  await page.getByRole('button', { name: '등록' }).click();
  await expect(page.getByText('요리 이름을 입력해 주세요.')).toBeVisible();
  await expect(page.getByLabel('재료', { exact: true })).toHaveValue(
    '된장 2큰술\n양파 1/2개\n두부 한 모',
  );
  await expect(page.getByRole('checkbox', { name: '국·찌개' })).toBeChecked();

  await page.getByLabel('요리 이름').fill('된장찌개');
  await page.getByLabel('조리 순서').fill('육수를 끓인다\n된장을 풀고 재료를 넣는다');
  await page.getByRole('button', { name: '등록' }).click();

  await expect(page.getByRole('heading', { level: 1, name: '된장찌개' })).toBeVisible();
  const ingredients = page.getByRole('region', { name: /^재료/ });
  await expect(ingredients.getByRole('listitem')).toHaveCount(3);
  await expect(ingredients).toContainText('양파0.5개');
  await expect(ingredients).toContainText('두부1모');
  await expect(page.getByRole('region', { name: '조리 순서' }).getByRole('listitem')).toHaveCount(
    2,
  );

  await createRecipe(page, {
    title: '카레',
    ingredients: '양파 1개\n감자 2개\n카레가루 1봉',
    steps: '재료를 볶는다\n물을 붓고 카레가루를 푼다',
  });

  await page.goto('/cooking/recipes');
  await page.getByRole('searchbox', { name: '레시피 검색' }).fill('감자');
  await page.getByRole('button', { name: '찾기' }).click();
  await expect(page.getByRole('link', { name: /카레/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /된장찌개/ })).toHaveCount(0);

  await page.goto('/cooking/recipes');
  await page
    .getByRole('navigation', { name: '태그' })
    .getByRole('link', { name: '국·찌개' })
    .click();
  await expect(page.getByRole('link', { name: /된장찌개/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /카레/ })).toHaveCount(0);
});

test('식단에 메뉴를 넣고 빼고, 지난주 식단을 빈 칸에 복사할 수 있다', async ({ page }) => {
  // 레시피 화면에서 바로 오늘 저녁에 넣기
  await page.goto('/cooking/recipes');
  await page.getByRole('link', { name: /된장찌개/ }).click();
  await page.getByRole('button', { name: '식단에 추가' }).click();
  await page
    .getByRole('dialog', { name: '식단에 메뉴 넣기' })
    .getByRole('button', { name: '넣기' })
    .click();
  await expect(page.getByText(`${formatShortDate(today)} 저녁에 넣었어요.`)).toBeVisible();

  // 식단 화면의 날짜 칸에서: 레시피를 고르면 메뉴 이름이 채워진다
  await page.goto('/cooking');
  const todayCard = dayCard(page, today);
  await expect(todayCard).toContainText('오늘');
  await expect(todayCard.getByRole('listitem', { name: '된장찌개' })).toBeVisible();

  await todayCard.getByRole('button', { name: /메뉴 추가$/ }).click();
  let dialog = page.getByRole('dialog', { name: '식단에 메뉴 넣기' });
  await dialog.getByRole('radio', { name: '점심' }).check();
  await dialog.getByLabel('레시피 (선택)').selectOption({ label: '카레' });
  await expect(dialog.getByLabel('메뉴 이름')).toHaveValue('카레');
  await dialog.getByRole('button', { name: '넣기' }).click();
  await expect(todayCard.getByRole('listitem', { name: '카레' })).toBeVisible();

  // 외식은 이름 없이 넣을 수 있고, 잘못 넣은 메뉴는 뺄 수 있다
  await todayCard.getByRole('button', { name: /메뉴 추가$/ }).click();
  dialog = page.getByRole('dialog', { name: '식단에 메뉴 넣기' });
  await dialog.getByRole('radio', { name: '아침' }).check();
  await dialog.getByRole('radio', { name: '외식' }).check();
  await expect(dialog.getByLabel('레시피 (선택)')).toHaveCount(0);
  await dialog.getByRole('button', { name: '넣기' }).click();
  await expect(todayCard.getByRole('listitem', { name: '외식' })).toBeVisible();
  await todayCard.getByRole('button', { name: '외식 빼기' }).click();
  await expect(todayCard.getByRole('listitem', { name: '외식' })).toHaveCount(0);

  // 다음 주로 가서 지난주(이번 주) 식단 복사. 두 번 눌러도 겹치지 않는다
  await page.getByRole('link', { name: '다음 주' }).click();
  await expect(page).toHaveURL(/week=/);
  await page.getByRole('button', { name: '지난주 복사' }).click();
  await expect(page.getByText('지난주 메뉴 2개를 빈 칸에 복사했어요.')).toBeVisible();
  await expect(page.getByRole('listitem', { name: '된장찌개' })).toHaveCount(1);
  await page.getByRole('button', { name: '지난주 복사' }).click();
  await expect(page.getByText(/복사할 메뉴가 없어요/)).toBeVisible();
  await expect(page.getByRole('listitem', { name: '카레' })).toHaveCount(1);
});

test('식단 재료를 합쳐 장보기로 가져오고, 빠른 추가 · 체크 · 정리를 할 수 있다', async ({
  page,
}) => {
  await page.goto('/cooking/shopping');
  await expect(page.getByText('살 것이 없어요')).toBeVisible();
  await page.getByRole('link', { name: '식단에서 재료 가져오기' }).click();

  // 된장찌개 양파 1/2개 + 카레 양파 1개 = 1.5개. 집에 있는 양념(된장)은 기본으로 빠진다
  await expect(page.getByRole('checkbox', { name: /^양파 1\.5개/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^된장 2큰술/ })).not.toBeChecked();
  await page.getByRole('button', { name: /^장보기에 \d+개 추가$/ }).click();

  await expect(page).toHaveURL(/\/cooking\/shopping$/);
  await expect(page.getByRole('region', { name: '채소·과일' })).toContainText('양파 1.5개');
  await expect(page.getByRole('checkbox', { name: /^된장/ })).toHaveCount(0);

  // 같은 이름 · 단위는 수량을 더한다
  await page.getByRole('textbox', { name: '살 것' }).fill('양파 2개');
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(page.getByText('이미 있던 양파에 더했어요.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '양파 3.5개' })).toBeVisible();

  await page.getByRole('textbox', { name: '살 것' }).fill('키친타월 2개');
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(page.getByRole('region', { name: '생활용품' })).toContainText('키친타월 2개');

  // 카테고리를 바꿀 수 있다
  await page.getByRole('button', { name: '두부 고치기' }).click();
  const dialog = page.getByRole('dialog', { name: '장보기 항목 고치기' });
  await dialog.getByLabel('카테고리').selectOption('유제품·계란');
  await dialog.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('region', { name: '유제품·계란' })).toContainText('두부 1모');

  // 체크하면 '산 것'으로 내려가고, 정리하면 목록에서 사라진다
  await page.getByRole('checkbox', { name: '키친타월 2개' }).check();
  const bought = page.getByRole('region', { name: /^산 것/ });
  await expect(bought).toContainText('키친타월 2개');
  await bought.getByRole('button', { name: '정리' }).click();
  await expect(page.getByText('산 것 1개를 정리했어요.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /키친타월/ })).toHaveCount(0);
});

test('레시피를 보관해도 이미 짠 식단의 메뉴는 남는다', async ({ page }) => {
  await page.goto('/cooking/recipes');
  await page.getByRole('link', { name: /된장찌개/ }).click();
  await page.getByRole('button', { name: '이 레시피 보관' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '보관' }).click();

  await expect(page).toHaveURL(/\/cooking\/recipes$/);
  await expect(page.getByRole('link', { name: /된장찌개/ })).toHaveCount(0);
  await page.goto('/cooking');
  const entry = dayCard(page, today).getByRole('listitem', { name: '된장찌개' });
  await expect(entry).toBeVisible();
  // 보관한 레시피로는 링크하지 않는다
  await expect(entry.getByRole('link')).toHaveCount(0);
});
