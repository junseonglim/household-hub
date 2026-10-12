import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { child, growthRecord } from '@/db/schema';
import type { LocalDate } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';

export type ChildItem = {
  id: string;
  name: string;
  dueDate: LocalDate | null;
  birthDate: LocalDate | null;
  sex: string | null;
};

const childColumns = {
  id: child.id,
  name: child.name,
  dueDate: child.dueDate,
  birthDate: child.birthDate,
  sex: child.sex,
};

/** 보관하지 않은 아이 (등록 순) */
export async function listChildren(ctx: MemberContext): Promise<ChildItem[]> {
  return db
    .select(childColumns)
    .from(child)
    .where(and(eq(child.householdId, ctx.householdId), isNull(child.archivedAt)))
    .orderBy(asc(child.sortOrder), asc(child.createdAt));
}

export async function getChild(ctx: MemberContext, childId: string): Promise<ChildItem | null> {
  const [found] = await db
    .select(childColumns)
    .from(child)
    .where(
      and(eq(child.id, childId), eq(child.householdId, ctx.householdId), isNull(child.archivedAt)),
    )
    .limit(1);
  return found ?? null;
}

/** 주소의 ?child= 로 고른 아이. 없거나 틀리면 첫째 */
export function pickChild(children: ChildItem[], param: unknown): ChildItem | null {
  return children.find((item) => item.id === param) ?? children[0] ?? null;
}

/** '태어났어요'에서 넣은 출생 몸무게 · 키 */
export async function getBirthMeasurement(
  ctx: MemberContext,
  target: ChildItem,
): Promise<{ weightKg: number | null; heightCm: number | null } | null> {
  if (!target.birthDate) return null;
  const [found] = await db
    .select({ weightKg: growthRecord.weightKg, heightCm: growthRecord.heightCm })
    .from(growthRecord)
    .where(
      and(
        eq(growthRecord.householdId, ctx.householdId),
        eq(growthRecord.childId, target.id),
        eq(growthRecord.measuredOn, target.birthDate),
      ),
    )
    .orderBy(asc(growthRecord.createdAt))
    .limit(1);
  return found ?? null;
}
