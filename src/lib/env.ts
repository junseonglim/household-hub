import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL은 postgres:// 로 시작해야 합니다'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `환경 변수가 올바르지 않습니다. .env.example을 참고해 .env.local을 만드세요.\n${z.prettifyError(parsed.error)}`,
  );
}

/** 서버 전용 환경 변수. 클라이언트 컴포넌트에서 import하지 않는다. */
export const env = parsed.data;
