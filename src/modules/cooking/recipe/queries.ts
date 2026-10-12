import { and, asc, desc, eq, exists, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { recipe, recipeIngredient } from '@/db/schema';
import type { MemberContext } from '@/modules/core/member-context';

// 레시피 조회. 보관한 레시피는 보이지 않는다.

const activeRecipes = (ctx: MemberContext) =>
  and(eq(recipe.householdId, ctx.householdId), isNull(recipe.archivedAt));

/** LIKE 검색어의 %, _ 를 글자 그대로 찾도록 */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export type RecipeListItem = {
  id: string;
  title: string;
  cookMinutes: number | null;
  servings: number | null;
  tags: string[];
};

/** 검색어는 요리 이름과 재료 이름에서 찾는다 ('양파' → 양파가 들어간 레시피) */
export async function listRecipes(
  ctx: MemberContext,
  filter: { q?: string; tag?: string } = {},
): Promise<RecipeListItem[]> {
  const q = filter.q?.trim();
  return db
    .select({
      id: recipe.id,
      title: recipe.title,
      cookMinutes: recipe.cookMinutes,
      servings: recipe.servings,
      tags: recipe.tags,
    })
    .from(recipe)
    .where(
      and(
        activeRecipes(ctx),
        q
          ? or(
              ilike(recipe.title, likePattern(q)),
              exists(
                db
                  .select({ one: sql`1` })
                  .from(recipeIngredient)
                  .where(
                    and(
                      eq(recipeIngredient.recipeId, recipe.id),
                      ilike(recipeIngredient.name, likePattern(q)),
                    ),
                  ),
              ),
            )
          : undefined,
        filter.tag ? sql`${filter.tag} = any(${recipe.tags})` : undefined,
      ),
    )
    .orderBy(desc(recipe.updatedAt));
}

/** 쓰고 있는 태그 (많이 쓴 순) */
export async function listRecipeTags(ctx: MemberContext): Promise<string[]> {
  const rows = await db.execute<{ tag: string }>(sql`
    select tag from ${recipe}, unnest(${recipe.tags}) as tag
    where ${recipe.householdId} = ${ctx.householdId} and ${recipe.archivedAt} is null
    group by tag order by count(*) desc, tag
  `);
  return rows.rows.map((row) => row.tag);
}

export type RecipeDetail = typeof recipe.$inferSelect & {
  ingredients: (typeof recipeIngredient.$inferSelect)[];
};

export async function getRecipe(
  ctx: MemberContext,
  recipeId: string,
): Promise<RecipeDetail | null> {
  const [row] = await db
    .select()
    .from(recipe)
    .where(and(activeRecipes(ctx), eq(recipe.id, recipeId)))
    .limit(1);
  if (!row) return null;
  const ingredients = await db
    .select()
    .from(recipeIngredient)
    .where(eq(recipeIngredient.recipeId, row.id))
    .orderBy(asc(recipeIngredient.sortOrder));
  return { ...row, ingredients };
}

/** 식단에 메뉴를 넣을 때 고르는 목록 (이름 순) */
export async function listRecipeOptions(
  ctx: MemberContext,
): Promise<{ id: string; title: string }[]> {
  return db
    .select({ id: recipe.id, title: recipe.title })
    .from(recipe)
    .where(activeRecipes(ctx))
    .orderBy(asc(recipe.title));
}
