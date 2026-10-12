import { and, eq } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { recipe, recipeIngredient } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { logActivity } from '@/modules/core/activity/log';
import { canAdminister } from '@/modules/core/household/permissions';
import type { MemberContext } from '@/modules/core/member-context';
import type { RecipeInput } from './validators';

// 레시피 업무 규칙 (docs/modules/cooking.md). 등록 · 수정은 누구나, 보관은 관리자 또는 만든 사람.

/** 보관: 관리자 이상, 또는 내가 만든 레시피 */
export function canArchiveRecipe(
  actor: { id: string; role: string },
  target: { createdByMemberId: string },
): boolean {
  return canAdminister(actor) || target.createdByMemberId === actor.id;
}

async function getActiveRecipe(tx: Tx, ctx: MemberContext, recipeId: string) {
  const [row] = await tx
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.householdId, ctx.householdId)))
    .limit(1)
    .for('update');
  if (!row || row.archivedAt) throw new DomainError('NOT_FOUND', '레시피를 찾을 수 없어요.');
  return row;
}

async function insertIngredients(tx: Tx, recipeId: string, input: RecipeInput) {
  if (input.ingredients.length === 0) return;
  await tx.insert(recipeIngredient).values(
    input.ingredients.map((item, index) => ({
      recipeId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      note: item.note,
      sortOrder: index,
    })),
  );
}

const recipeFields = (input: RecipeInput) => ({
  title: input.title,
  description: input.description,
  servings: input.servings,
  cookMinutes: input.cookMinutes,
  steps: input.steps,
  tags: input.tags,
  sourceUrl: input.sourceUrl,
});

export async function createRecipe(ctx: MemberContext, input: RecipeInput): Promise<string> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(recipe)
      .values({
        householdId: ctx.householdId,
        createdByMemberId: ctx.memberId,
        ...recipeFields(input),
      })
      .returning({ id: recipe.id });
    await insertIngredients(tx, created!.id, input);
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'cooking',
      action: 'recipe.created',
      target: { type: 'recipe', id: created!.id },
      payload: { title: input.title },
    });
    return created!.id;
  });
}

/** 재료는 통째로 바꾼다 (순서 · 줄 단위 편집이라 행을 맞출 필요가 없다) */
export async function updateRecipe(ctx: MemberContext, recipeId: string, input: RecipeInput) {
  await db.transaction(async (tx) => {
    const current = await getActiveRecipe(tx, ctx, recipeId);
    await tx.update(recipe).set(recipeFields(input)).where(eq(recipe.id, current.id));
    await tx.delete(recipeIngredient).where(eq(recipeIngredient.recipeId, current.id));
    await insertIngredients(tx, current.id, input);
  });
}

/** 보관: 목록에서 사라진다. 이 레시피로 짠 식단은 메뉴 이름이 복사돼 있어 그대로 보인다 */
export async function archiveRecipe(ctx: MemberContext, recipeId: string) {
  await db.transaction(async (tx) => {
    const current = await getActiveRecipe(tx, ctx, recipeId);
    if (!canArchiveRecipe({ id: ctx.memberId, role: ctx.role }, current)) {
      throw new DomainError('FORBIDDEN', '내가 만든 레시피만 보관할 수 있어요.');
    }
    await tx.update(recipe).set({ archivedAt: new Date() }).where(eq(recipe.id, current.id));
  });
}
