// 관리자 모두가 비밀번호를 잊었을 때 쓰는 비상용 스크립트 (docs/05-auth-household.md 4.3절)
//
// 사용법:  pnpm admin:reset-password <이메일>
// 운영 DB에 쓰려면 Neon 연결 주소를 DATABASE_URL로 지정해 실행한다:
//   PowerShell: $env:DATABASE_URL='postgres://...'; pnpm admin:reset-password mom@example.com
import nextEnv from '@next/env';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';
import { generateTempPassword } from '../src/modules/core/household/temp-password.ts';

nextEnv.loadEnvConfig(process.cwd());

const email = process.argv[2]?.trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!email || !databaseUrl) {
  console.error('사용법: pnpm admin:reset-password <이메일>  (DATABASE_URL 필요)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('begin');
  const { rows } = await client.query<{ id: string }>('select id from "user" where email = $1', [
    email,
  ]);
  const userId = rows[0]?.id;
  if (!userId) throw new Error(`${email} 계정을 찾을 수 없어요.`);

  const tempPassword = generateTempPassword();
  const updated = await client.query(
    `update account set password = $1, updated_at = now()
     where user_id = $2 and provider_id = 'credential'`,
    [await hashPassword(tempPassword), userId],
  );
  if (updated.rowCount === 0) throw new Error('이메일과 비밀번호로 가입한 계정이 아니에요.');

  await client.query('delete from session where user_id = $1', [userId]);
  await client.query(
    'update household_member set must_change_password = true, updated_at = now() where user_id = $1',
    [userId],
  );
  await client.query('commit');

  console.log(`\n${email}의 임시 비밀번호: ${tempPassword}`);
  console.log('이 비밀번호로 로그인하면 비밀번호를 바꾸도록 안내돼요.\n');
} catch (error) {
  await client.query('rollback');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
