import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { updateRecipeAction } from '@/modules/cooking/recipe/actions';
import { RecipeForm } from '@/modules/cooking/recipe/components/recipe-form';
import { getRecipe } from '@/modules/cooking/recipe/queries';
import { formatItemLine } from '@/modules/cooking/shopping/parse';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '레시피 수정' };

export default async function EditRecipePage({ params }: PageProps<'/cooking/recipes/[id]/edit'>) {
  const ctx = await requireMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const recipe = await getRecipe(ctx, id);
  if (!recipe) notFound();

  return (
    <>
      <PageHeader
        title="레시피 수정"
        back={{ href: `/cooking/recipes/${recipe.id}` as Route, label: recipe.title }}
      />
      <RecipeForm
        action={updateRecipeAction}
        submitLabel="저장"
        initial={{
          recipeId: recipe.id,
          title: recipe.title,
          description: recipe.description ?? '',
          servings: recipe.servings?.toString() ?? '',
          cookMinutes: recipe.cookMinutes?.toString() ?? '',
          tags: recipe.tags,
          ingredients: recipe.ingredients.map(formatItemLine).join('\n'),
          steps: recipe.steps.join('\n'),
          sourceUrl: recipe.sourceUrl ?? '',
        }}
      />
    </>
  );
}
