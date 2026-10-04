import { expect, type Page } from '@playwright/test';

type Account = { name: string; email: string; password: string };

export async function signUp(page: Page, account: Account) {
  await page.goto('/signup');
  await page.getByLabel('이름').fill(account.name);
  await page.getByLabel('이메일').fill(account.email);
  await page.getByLabel('비밀번호', { exact: true }).fill(account.password);
  await page.getByLabel('비밀번호 확인').fill(account.password);
  await page.getByRole('button', { name: '가입하기' }).click();
}

export async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
}

export async function expectPendingScreen(page: Page) {
  await expect(page).toHaveURL(/\/pending$/);
  await expect(page.getByText('관리자 승인을 기다리고 있어요')).toBeVisible();
}
