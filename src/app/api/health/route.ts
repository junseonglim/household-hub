import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/** 앱과 DB 연결 상태 확인용. 배포 후 점검에도 쓴다. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: 'up' });
  } catch (error) {
    console.error('[health] DB 연결 실패', error);
    return Response.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
