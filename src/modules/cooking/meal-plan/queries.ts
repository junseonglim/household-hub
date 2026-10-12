import { and, asc, between, eq } from 'drizzle-orm';
import { db } from '@/db';
import { householdMember, mealPlanEntry, recipe } from '@/db/schema';
import { addDays, type LocalDate } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';

export type MealPlanItem = {
  id: string;
  date: LocalDate;
  mealType: string;
  kind: string;
  title: string;
  /** 보관하지 않은 레시피일 때만 (링크용) */
  recipeId: string | null;
  cookName: string | null;
  cookColor: string | null;
};

/** 월요일부터 7일치 식단 (날짜 · 끼니 · 넣은 순서) */
export async function getWeekPlan(ctx: MemberContext, monday: LocalDate): Promise<MealPlanItem[]> {
  const rows = await db
    .select({
      id: mealPlanEntry.id,
      date: mealPlanEntry.date,
      mealType: mealPlanEntry.mealType,
      kind: mealPlanEntry.kind,
      title: mealPlanEntry.title,
      recipeId: mealPlanEntry.recipeId,
      recipeArchivedAt: recipe.archivedAt,
      cookName: householdMember.displayName,
      cookColor: householdMember.color,
    })
    .from(mealPlanEntry)
    .leftJoin(recipe, eq(mealPlanEntry.recipeId, recipe.id))
    .leftJoin(householdMember, eq(mealPlanEntry.cookMemberId, householdMember.id))
    .where(
      and(
        eq(mealPlanEntry.householdId, ctx.householdId),
        between(mealPlanEntry.date, monday, addDays(monday, 6)),
      ),
    )
    .orderBy(asc(mealPlanEntry.date), asc(mealPlanEntry.sortOrder), asc(mealPlanEntry.createdAt));
  // 보관한 레시피로는 링크하지 않는다 (메뉴 이름은 복사돼 있어 그대로 보인다)
  return rows.map(({ recipeArchivedAt, ...row }) => ({
    ...row,
    recipeId: recipeArchivedAt ? null : row.recipeId,
  }));
}
