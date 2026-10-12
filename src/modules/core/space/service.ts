import { and, asc, eq, isNull, max, ne } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { space, task } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { canAdminister } from '../household/permissions';
import type { MemberContext } from '../member-context';

// 공간 관리 (docs/modules/cleaning.md 3절). 관리자 이상만 바꿀 수 있다.

function assertCanManage(ctx: MemberContext) {
  if (!canAdminister({ id: ctx.memberId, role: ctx.role })) {
    throw new DomainError('FORBIDDEN', '공간은 관리자만 바꿀 수 있어요.');
  }
}

const activeSpaces = (ctx: MemberContext) =>
  and(eq(space.householdId, ctx.householdId), isNull(space.archivedAt));

async function assertUniqueName(tx: Tx, ctx: MemberContext, name: string, exceptId?: string) {
  const [duplicate] = await tx
    .select({ id: space.id })
    .from(space)
    .where(
      and(activeSpaces(ctx), eq(space.name, name), exceptId ? ne(space.id, exceptId) : undefined),
    )
    .limit(1);
  if (duplicate) throw new DomainError('INVALID', `'${name}' 공간이 이미 있어요.`);
}

async function getActiveSpace(tx: Tx, ctx: MemberContext, spaceId: string) {
  const [row] = await tx
    .select()
    .from(space)
    .where(and(activeSpaces(ctx), eq(space.id, spaceId)))
    .limit(1);
  if (!row) throw new DomainError('NOT_FOUND', '공간을 찾을 수 없어요.');
  return row;
}

export async function createSpace(
  ctx: MemberContext,
  input: { name: string; icon: string | null },
) {
  assertCanManage(ctx);
  await db.transaction(async (tx) => {
    await assertUniqueName(tx, ctx, input.name);
    const [last] = await tx
      .select({ sortOrder: max(space.sortOrder) })
      .from(space)
      .where(eq(space.householdId, ctx.householdId));
    await tx.insert(space).values({
      householdId: ctx.householdId,
      name: input.name,
      icon: input.icon,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    });
  });
}

export async function updateSpace(
  ctx: MemberContext,
  input: { spaceId: string; name: string; icon: string | null },
) {
  assertCanManage(ctx);
  await db.transaction(async (tx) => {
    const target = await getActiveSpace(tx, ctx, input.spaceId);
    await assertUniqueName(tx, ctx, input.name, target.id);
    await tx
      .update(space)
      .set({ name: input.name, icon: input.icon })
      .where(eq(space.id, target.id));
  });
}

/** 바로 위 · 아래 공간과 순서를 바꾼다 */
export async function moveSpace(
  ctx: MemberContext,
  input: { spaceId: string; direction: 'up' | 'down' },
) {
  assertCanManage(ctx);
  await db.transaction(async (tx) => {
    const ordered = await tx
      .select({ id: space.id })
      .from(space)
      .where(activeSpaces(ctx))
      .orderBy(asc(space.sortOrder), asc(space.createdAt));
    const index = ordered.findIndex((row) => row.id === input.spaceId);
    if (index === -1) throw new DomainError('NOT_FOUND', '공간을 찾을 수 없어요.');
    const swapWith = input.direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return;

    [ordered[index], ordered[swapWith]] = [ordered[swapWith]!, ordered[index]!];
    // 순서 값을 0부터 다시 매긴다 (예전 값이 겹쳐 있어도 정리된다)
    for (const [sortOrder, row] of ordered.entries()) {
      await tx.update(space).set({ sortOrder }).where(eq(space.id, row.id));
    }
  });
}

/** 보관: 이 공간의 할 일은 '공간 없음'으로 옮긴다. 할 일과 완료 기록은 그대로 남는다. */
export async function archiveSpace(ctx: MemberContext, spaceId: string) {
  assertCanManage(ctx);
  await db.transaction(async (tx) => {
    const target = await getActiveSpace(tx, ctx, spaceId);
    await tx
      .update(task)
      .set({ spaceId: null })
      .where(and(eq(task.householdId, ctx.householdId), eq(task.spaceId, target.id)));
    await tx.update(space).set({ archivedAt: new Date() }).where(eq(space.id, target.id));
  });
}
