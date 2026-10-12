import { expect, test } from '@playwright/test';

test('첫 화면은 청소로 이동한다', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cleaning$/);
  await expect(page.getByRole('heading', { level: 1, name: '청소' })).toBeVisible();
});

test('주 메뉴로 네 화면을 오갈 수 있다', async ({ page }) => {
  await page.goto('/cleaning');
  const nav = page.getByRole('navigation', { name: '주 메뉴' });

  for (const label of ['요리', '육아', '설정', '청소']) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }
});

test('DB 연결 상태를 확인할 수 있다', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ ok: true, db: 'up' });
});
