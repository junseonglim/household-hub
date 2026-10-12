'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, invalidInput, pick, type FormState } from '@/lib/form-state';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import { archiveRecipe, createRecipe, updateRecipe } from './service';
import { recipeFormInput, recipeFormSchema, recipeTargetSchema } from './validators';

// 요리 화면 전체(식단 · 레시피 · 장보기)를 새로 그린다
const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/cooking', 'layout'));

const RECIPE_FORM_FIELDS = [
  'title',
  'description',
  'servings',
  'cookMinutes',
  'customTags',
  'ingredients',
  'steps',
  'sourceUrl',
];

export async function createRecipeAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = recipeFormSchema.safeParse(recipeFormInput(formData, values));
    if (!parsed.success) return invalidInput(parsed.error, pick(values, RECIPE_FORM_FIELDS));
    const recipeId = await createRecipe(ctx, parsed.data);
    redirect(`/cooking/recipes/${recipeId}` as Route);
  });
}

export async function updateRecipeAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const target = recipeTargetSchema.safeParse(values);
    if (!target.success) return invalidInput(target.error);
    const parsed = recipeFormSchema.safeParse(recipeFormInput(formData, values));
    if (!parsed.success) return invalidInput(parsed.error, pick(values, RECIPE_FORM_FIELDS));
    await updateRecipe(ctx, target.data.recipeId, parsed.data);
    redirect(`/cooking/recipes/${target.data.recipeId}` as Route);
  });
}

export async function archiveRecipeAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = recipeTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await archiveRecipe(ctx, parsed.data.recipeId);
    redirect('/cooking/recipes');
  });
}
