import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { createRecipeAction } from '@/modules/cooking/recipe/actions';
import { RecipeForm } from '@/modules/cooking/recipe/components/recipe-form';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '레시피 추가' };

export default async function NewRecipePage() {
  await requireMember();
  return (
    <>
      <PageHeader title="레시피 추가" back={{ href: '/cooking/recipes', label: '레시피' }} />
      <RecipeForm
        action={createRecipeAction}
        submitLabel="등록"
        initial={{
          title: '',
          description: '',
          servings: '',
          cookMinutes: '',
          tags: [],
          ingredients: '',
          steps: '',
          sourceUrl: '',
        }}
      />
    </>
  );
}
