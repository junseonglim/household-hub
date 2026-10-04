import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

// Next.js와 같은 규칙으로 .env.local 등을 읽는다.
loadEnvConfig(process.cwd());

// Neon은 마이그레이션에 풀링(pgbouncer)을 거치지 않는 직접 연결 주소를 권장한다.
// Vercel–Neon 연동은 DATABASE_URL_UNPOOLED를 함께 넣어 준다. 로컬은 DATABASE_URL만 있으면 된다.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL이 없습니다. .env.example을 참고해 .env.local을 만드세요.');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
