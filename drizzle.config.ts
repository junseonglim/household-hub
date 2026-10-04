import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

// Next.js와 같은 규칙으로 .env.local 등을 읽는다.
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
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
