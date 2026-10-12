import { and, between, eq, isNull, max } from 'drizzle-orm';
import { db } from '@/db';
import { householdMember, mealPlanEntry, recipe } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { addDays, startOfWeek, type LocalDate } from '@/lib/local-date';
import { logActivity } from '@/modules/core/activity/log';
import type { MemberContext } from '@/modules/core/member-context';
import { MEAL_KIND_LABELS } from '../constants';
import type { AddEntryInput } from './validators';

// 주간 식단 업무 규칙 (docs/modules/cooking.md 5절). 식단은 승인된 구성원 누구나 바꿀 수 있다.

export async function addEntry(ctx: MemberContext, input: AddEntryInput): Promise<string> {
  return db.transaction(async (tx) => {
    let title = input.title?.trim() || '';
    let recipeId: string | null = null;
    if (input.recipeId) {
      const [found] = await tx
        .select({ id: recipe.id, title: recipe.title })
        .from(recipe)
        .where(
          and(
            eq(recipe.id, input.recipeId),
            eq(recipe.householdId, ctx.householdId),
            isNull(recipe.archivedAt),
          ),
        )
        .limit(1);
      if (!found) throw new DomainError('INVALID', '레시피를 다시 골라 주세요.');
      recipeId = found.id;
      // 메뉴 이름은 복사해 둔다 (레시피를 보관해도 식단은 그대로 보이게)
      title ||= found.title;
    }
    title ||= MEAL_KIND_LABELS[input.kind];

    let cookMemberId: string | null = null;
    if (input.kind === 'home' && input.cookMemberId) {
      const [cook] = await tx
        .select({ id: householdMember.id })
        .from(householdMember)
        .where(
          and(
            eq(householdMember.id, input.cookMemberId),
            eq(householdMember.householdId, ctx.householdId),
            eq(householdMember.status, 'active'),
          ),
        )
        .limit(1);
      if (!cook) throw new DomainError('INVALID', '요리 담당을 다시 골라 주세요.');
      cookMemberId = cook.id;
    }

    const [last] = await tx
      .select({ sortOrder: max(mealPlanEntry.sortOrder) })
      .from(mealPlanEntry)
      .where(
        and(
          eq(mealPlanEntry.householdId, ctx.householdId),
          eq(mealPlanEntry.date, input.date),
          eq(mealPlanEntry.mealType, input.mealType),
        ),
      );
    const [created] = await tx
      .insert(mealPlanEntry)
      .values({
        householdId: ctx.householdId,
        date: input.date,
        mealType: input.mealType,
        kind: input.kind,
        title,
        recipeId,
        cookMemberId,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      })
      .returning({ id: mealPlanEntry.id });
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'cooking',
      action: 'meal_plan.entry_added',
      target: { type: 'meal_plan_entry', id: created!.id },
      payload: { date: input.date, mealType: input.mealType, title },
    });
    return created!.id;
  });
}

export async function removeEntry(ctx: MemberContext, entryId: string) {
  const deleted = await db
    .delete(mealPlanEntry)
    .where(and(eq(mealPlanEntry.id, entryId), eq(mealPlanEntry.householdId, ctx.householdId)))
    .returning({ id: mealPlanEntry.id });
  if (deleted.length === 0) throw new DomainError('NOT_FOUND', '이미 지운 메뉴예요.');
}

/**
 * 지난주 식단을 이번 주로 복사한다. 이미 메뉴가 있는 칸(날짜 + 끼니)은 건드리지 않는다.
 * @returns 복사한 메뉴 수
 */
export async function copyPreviousWeek(ctx: MemberContext, weekStart: LocalDate): Promise<number> {
  const monday = startOfWeek(weekStart);
  const previousMonday = addDays(monday, -7);
  return db.transaction(async (tx) => {
    const inWeek = (from: LocalDate) =>
      and(
        eq(mealPlanEntry.householdId, ctx.householdId),
        between(mealPlanEntry.date, from, addDays(from, 6)),
      );
    const [previous, current] = await Promise.all([
      tx.select().from(mealPlanEntry).where(inWeek(previousMonday)),
      tx
        .select({ date: mealPlanEntry.date, mealType: mealPlanEntry.mealType })
        .from(mealPlanEntry)
        .where(inWeek(monday)),
    ]);
    const filled = new Set(current.map((entry) => `${entry.date}|${entry.mealType}`));
    const copies = previous
      .map((entry) => ({ ...entry, date: addDays(entry.date, 7) }))
      .filter((entry) => !filled.has(`${entry.date}|${entry.mealType}`))
      .map((entry) => ({
        householdId: ctx.householdId,
        date: entry.date,
        mealType: entry.mealType,
        kind: entry.kind,
        title: entry.title,
        recipeId: entry.recipeId,
        cookMemberId: entry.cookMemberId,
        note: entry.note,
        sortOrder: entry.sortOrder,
      }));
    if (copies.length === 0) return 0;

    await tx.insert(mealPlanEntry).values(copies);
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'cooking',
      action: 'meal_plan.week_copied',
      payload: { fromWeek: previousMonday, toWeek: monday, count: copies.length },
    });
    return copies.length;
  });
}
