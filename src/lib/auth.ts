import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { env } from '@/lib/env';

const ONE_DAY = 60 * 60 * 24;

const https = (host: string | undefined) => (host ? `https://${host}` : undefined);

/**
 * 사이트 주소. BETTER_AUTH_URL이 있으면 그 값,
 * Vercel에서는 운영 주소 / 미리보기 주소를 자동으로 쓰고, 그 외에는 로컬 주소.
 */
function resolveBaseUrl() {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === 'production') {
    return https(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  return https(process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL) ?? 'http://localhost:3000';
}

export const auth = betterAuth({
  appName: '우리집',
  baseURL: resolveBaseUrl(),
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].flatMap((host) => (host ? [`https://${host}`] : [])),
  database: drizzleAdapter(db, { provider: 'pg', schema, transaction: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    disableSignUp: !env.SIGNUP_ENABLED,
    autoSignIn: true,
  },
  // 가족 앱이라 자주 다시 로그인하지 않도록 30일 유지, 쓰는 동안 하루 단위로 연장 (docs/05-auth-household.md 5.2절)
  session: { expiresIn: 30 * ONE_DAY, updateAge: ONE_DAY },
  rateLimit: {
    enabled: env.AUTH_RATE_LIMIT
      ? env.AUTH_RATE_LIMIT === 'on'
      : process.env.NODE_ENV === 'production',
    storage: 'database',
  },
  telemetry: { enabled: false },
  // 서버 액션에서 로그인 쿠키를 설정하려면 필요하다. 플러그인 목록의 마지막에 둔다.
  plugins: [nextCookies()],
});
