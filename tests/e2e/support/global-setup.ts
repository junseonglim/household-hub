import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { ADMIN_DATABASE_URL, E2E_DATABASE_NAME, E2E_DATABASE_URL } from './config';

/** 테스트 DB를 만들고(없으면), 매번 비운 뒤 마이그레이션을 적용한다 */
export default async function globalSetup() {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  const exists = await admin.query('select 1 from pg_database where datname = $1', [
    E2E_DATABASE_NAME,
  ]);
  if (exists.rowCount === 0) await admin.query(`create database ${E2E_DATABASE_NAME}`);
  await admin.end();

  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  await client.query(
    'drop schema if exists drizzle cascade; drop schema if exists public cascade; create schema public;',
  );
  await migrate(drizzle({ client }), { migrationsFolder: 'src/db/migrations' });
  await client.end();
}
