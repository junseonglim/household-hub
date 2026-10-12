import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { householdMember, user } from '@/db/schema';
import type { MemberContext } from '../member-context';

export type MemberListItem = {
  id: string;
  displayName: string;
  color: string;
  role: string;
  status: string;
  name: string;
  email: string;
  createdAt: Date;
  isMe: boolean;
};

/** 활성 구성원과 승인 대기자 (내보낸 구성원 제외) */
export async function listMembers(ctx: MemberContext): Promise<MemberListItem[]> {
  const rows = await db
    .select({
      id: householdMember.id,
      displayName: householdMember.displayName,
      color: householdMember.color,
      role: householdMember.role,
      status: householdMember.status,
      name: user.name,
      email: user.email,
      createdAt: householdMember.createdAt,
    })
    .from(householdMember)
    .innerJoin(user, eq(householdMember.userId, user.id))
    .where(
      and(
        eq(householdMember.householdId, ctx.householdId),
        inArray(householdMember.status, ['active', 'pending']),
      ),
    )
    .orderBy(asc(householdMember.createdAt));
  return rows.map((row) => ({ ...row, isMe: row.id === ctx.memberId }));
}

export type ActiveMember = { id: string; displayName: string; color: string };

/** 담당자 · 완료한 사람 고르기용 (가입 순) */
export async function listActiveMembers(ctx: MemberContext): Promise<ActiveMember[]> {
  return db
    .select({
      id: householdMember.id,
      displayName: householdMember.displayName,
      color: householdMember.color,
    })
    .from(householdMember)
    .where(
      and(eq(householdMember.householdId, ctx.householdId), eq(householdMember.status, 'active')),
    )
    .orderBy(asc(householdMember.createdAt));
}

export async function countPendingMembers(householdId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(householdMember)
    .where(
      and(eq(householdMember.householdId, householdId), eq(householdMember.status, 'pending')),
    );
  return row?.value ?? 0;
}
