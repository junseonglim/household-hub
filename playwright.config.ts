import { defineConfig, devices } from '@playwright/test';
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT, OWNER_STATE } from './tests/e2e/support/config';

// 운영과 같은 빌드(next build + start)를 별도 포트 · 별도 테스트 DB로 띄워 검사한다.
// 테스트끼리 DB 상태를 이어서 쓰므로 한 번에 하나씩 실행한다.
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/support/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    // 1) 첫 가입자(owner)를 만들고 로그인 상태를 저장한다
    { name: 'setup', testMatch: /owner\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    // 2) 가입 · 승인 흐름 (PC 화면에서 한 번)
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    // 3) 화면 이동은 휴대폰 · PC 모두
    {
      name: 'mobile',
      testMatch: /navigation\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: OWNER_STATE },
    },
    {
      name: 'desktop',
      testMatch: /navigation\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: OWNER_STATE },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: E2E_BASE_URL,
      BETTER_AUTH_SECRET: 'e2e-only-secret-not-used-anywhere-else-0123456789',
      SIGNUP_ENABLED: 'true',
      // 짧은 시간에 로그인을 여러 번 하므로 시도 횟수 제한을 끈다
      AUTH_RATE_LIMIT: 'off',
    },
  },
});
