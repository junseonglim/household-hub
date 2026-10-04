import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { session } from '@/db/schema';

/**
 * 지금 쓰는 세션만 남기고 같은 사용자의 다른 로그인을 모두 끊는다.
 * (Better Auth의 revokeOtherSessions는 현재 세션도 새로 바꾸는데, 그러면 같은 요청 안에서
 *  화면을 다시 그릴 때 옛 쿠키로 인식돼 로그아웃된 것처럼 보이므로 직접 처리한다.)
 */
export async function revokeOtherSessions(userId: string, currentSessionToken: string) {
  await db
    .delete(session)
    .where(and(eq(session.userId, userId), ne(session.token, currentSessionToken)));
}
