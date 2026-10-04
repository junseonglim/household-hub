import { expect, test as setup } from '@playwright/test';
import { signUp } from './support/auth-helpers';
import { OWNER, OWNER_STATE } from './support/config';

setup('첫 가입자는 바로 우리집 소유자가 된다', async ({ page }) => {
  await signUp(page, OWNER);

  await expect(page).toHaveURL(/\/cleaning$/);
  await page.goto('/settings');
  await expect(page.getByText('우리집 · 소유자')).toBeVisible();

  await page.context().storageState({ path: OWNER_STATE });
});
