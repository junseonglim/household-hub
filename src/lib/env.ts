import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL은 postgres:// 로 시작해야 합니다'),
  /** 세션 서명용 비밀값. 32자 이상 무작위 문자열 */
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET은 32자 이상이어야 합니다'),
  /** 사이트 주소. Vercel에서는 비워 두면 자동으로 정해진다 */
  BETTER_AUTH_URL: z.url().optional(),
  /** 'false'로 두면 새 가입을 막는다 (가족이 모두 가입한 뒤) */
  SIGNUP_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  /** 로그인 · 가입 시도 횟수 제한. 비워 두면 운영(production)에서만 켠다 */
  AUTH_RATE_LIMIT: z.enum(['on', 'off']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `환경 변수가 올바르지 않습니다. .env.example을 참고해 .env.local을 만드세요.\n${z.prettifyError(parsed.error)}`,
  );
}

/** 서버 전용 환경 변수. 클라이언트 컴포넌트에서 import하지 않는다. */
export const env = parsed.data;
