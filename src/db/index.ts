import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';

// 개발 중 핫 리로드마다 연결 풀이 새로 생기지 않도록 전역에 보관한다.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool = globalForDb.pgPool ?? new Pool({ connectionString: env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;

export const db = drizzle({ client: pool, schema, casing: 'snake_case' });
