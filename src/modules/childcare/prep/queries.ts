import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { householdMember, prepItem } from '@/db/schema';
import type { MemberContext } from '@/modules/core/member-context';

export type PrepListItem = {
  id: string;
  category: string;
  title: string;
  quantity: string | null;
  note: string | null;
  isDone: boolean;
  doneByName: string | null;
};

/** 준비물 전체 (넣은 순서). 카테고리별로 나누는 것은 화면에서 */
export async function listPrepItems(ctx: MemberContext): Promise<PrepListItem[]> {
  return db
    .select({
      id: prepItem.id,
      category: prepItem.category,
      title: prepItem.title,
      quantity: prepItem.quantity,
      note: prepItem.note,
      isDone: prepItem.isDone,
      doneByName: householdMember.displayName,
    })
    .from(prepItem)
    .leftJoin(householdMember, eq(prepItem.doneByMemberId, householdMember.id))
    .where(eq(prepItem.householdId, ctx.householdId))
    .orderBy(asc(prepItem.sortOrder), asc(prepItem.createdAt));
}

/** 오늘 화면의 '준비 23 / 61' */
export async function getPrepProgress(
  ctx: MemberContext,
): Promise<{ done: number; total: number }> {
  const [row] = await db
    .select({
      total: count(),
      done: sql<number>`count(*) filter (where ${prepItem.isDone})`.mapWith(Number),
    })
    .from(prepItem)
    .where(eq(prepItem.householdId, ctx.householdId));
  return { done: row?.done ?? 0, total: row?.total ?? 0 };
}
