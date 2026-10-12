import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { space } from '@/db/schema';
import type { MemberContext } from '../member-context';

export type SpaceItem = { id: string; name: string; icon: string | null };

/** 보관하지 않은 공간 (정한 순서대로) */
export async function listSpaces(ctx: MemberContext): Promise<SpaceItem[]> {
  return db
    .select({ id: space.id, name: space.name, icon: space.icon })
    .from(space)
    .where(and(eq(space.householdId, ctx.householdId), isNull(space.archivedAt)))
    .orderBy(asc(space.sortOrder), asc(space.createdAt));
}

export async function getSpace(ctx: MemberContext, spaceId: string): Promise<SpaceItem | null> {
  const [row] = await db
    .select({ id: space.id, name: space.name, icon: space.icon })
    .from(space)
    .where(
      and(eq(space.id, spaceId), eq(space.householdId, ctx.householdId), isNull(space.archivedAt)),
    )
    .limit(1);
  return row ?? null;
}
