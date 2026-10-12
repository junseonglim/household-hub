import { and, asc, between, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { householdMember, mealPlanEntry, recipeIngredient, shoppingItem } from '@/db/schema';
import type { LocalDate } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';
import { guessCategory, SHOPPING_CATEGORIES, type ShoppingCategory } from './category';
import { isPantryStaple, mergeIngredients, type MergedIngredient } from './merge';

export type ShoppingListItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  note: string | null;
  isChecked: boolean;
  checkedAt: Date | null;
  checkedByName: string | null;
};

/** 정리하지 않은 항목 전체 (체크한 것 포함) */
export async function listOpenItems(ctx: MemberContext): Promise<ShoppingListItem[]> {
  return db
    .select({
      id: shoppingItem.id,
      name: shoppingItem.name,
      quantity: shoppingItem.quantity,
      unit: shoppingItem.unit,
      category: shoppingItem.category,
      note: shoppingItem.note,
      isChecked: shoppingItem.isChecked,
      checkedAt: shoppingItem.checkedAt,
      checkedByName: householdMember.displayName,
    })
    .from(shoppingItem)
    .leftJoin(householdMember, eq(shoppingItem.checkedByMemberId, householdMember.id))
    .where(and(eq(shoppingItem.householdId, ctx.householdId), isNull(shoppingItem.clearedAt)))
    .orderBy(asc(shoppingItem.createdAt));
}

export type ImportCandidate = MergedIngredient & {
  category: ShoppingCategory;
  /** 집에 늘 있는 양념이라 기본으로 선택하지 않는다 */
  pantry: boolean;
};

/**
 * 기간 안의 식단(집밥 + 레시피 있는 메뉴)에서 재료를 모아 합친다.
 * 레시피 없이 이름만 쓴 메뉴는 재료를 알 수 없어서 따로 알려 준다.
 */
export async function getImportPreview(
  ctx: MemberContext,
  range: { from: LocalDate; to: LocalDate },
): Promise<{ candidates: ImportCandidate[]; menusWithoutRecipe: string[] }> {
  const inRange = and(
    eq(mealPlanEntry.householdId, ctx.householdId),
    between(mealPlanEntry.date, range.from, range.to),
    eq(mealPlanEntry.kind, 'home'),
  );
  const [lines, withoutRecipe] = await Promise.all([
    db
      .select({
        name: recipeIngredient.name,
        quantity: recipeIngredient.quantity,
        unit: recipeIngredient.unit,
        recipeTitle: mealPlanEntry.title,
      })
      .from(mealPlanEntry)
      .innerJoin(recipeIngredient, eq(recipeIngredient.recipeId, mealPlanEntry.recipeId))
      .where(and(inRange, isNotNull(mealPlanEntry.recipeId)))
      .orderBy(asc(mealPlanEntry.date), asc(recipeIngredient.sortOrder)),
    db
      .selectDistinct({ title: mealPlanEntry.title })
      .from(mealPlanEntry)
      .where(and(inRange, isNull(mealPlanEntry.recipeId))),
  ]);

  const order = (category: ShoppingCategory) => SHOPPING_CATEGORIES.indexOf(category);
  const candidates = mergeIngredients(lines)
    .map((ingredient) => ({
      ...ingredient,
      category: guessCategory(ingredient.name),
      pantry: isPantryStaple(ingredient.name),
    }))
    .sort((a, b) => order(a.category) - order(b.category));
  return { candidates, menusWithoutRecipe: withoutRecipe.map((row) => row.title) };
}
