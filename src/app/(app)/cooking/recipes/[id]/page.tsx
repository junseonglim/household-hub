import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Pencil } from 'lucide-react';
import { z } from 'zod';
import { ConfirmActionButton } from '@/components/form/confirm-action-button';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { todayIn } from '@/lib/local-date';
import { AddEntryDialog } from '@/modules/cooking/meal-plan/components/add-entry-dialog';
import { archiveRecipeAction } from '@/modules/cooking/recipe/actions';
import { getRecipe, listRecipeOptions } from '@/modules/cooking/recipe/queries';
import { canArchiveRecipe } from '@/modules/cooking/recipe/service';
import { formatQuantity } from '@/modules/cooking/shopping/parse';
import { requireMember } from '@/modules/core/auth-context';
import { listActiveMembers } from '@/modules/core/household/queries';

export const metadata: Metadata = { title: '레시피' };

export default async function RecipeDetailPage({ params }: PageProps<'/cooking/recipes/[id]'>) {
  const ctx = await requireMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [recipe, recipes, members] = await Promise.all([
    getRecipe(ctx, id),
    listRecipeOptions(ctx),
    listActiveMembers(ctx),
  ]);
  if (!recipe) notFound();

  const meta = [
    recipe.servings && `${recipe.servings}인분`,
    recipe.cookMinutes && `${recipe.cookMinutes}분`,
  ].filter(Boolean);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={recipe.title}
          description={recipe.description ?? undefined}
          back={{ href: '/cooking/recipes', label: '레시피' }}
        />
        <Link
          href={`/cooking/recipes/${recipe.id}/edit` as Route}
          className={buttonVariants({ variant: 'outline', className: 'mt-7 h-9' })}
        >
          <Pencil aria-hidden />
          수정
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {meta.length > 0 && <span>{meta.join(' · ')}</span>}
        {recipe.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-4"
          >
            출처
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>

      <div className="mb-8">
        <AddEntryDialog
          trigger="recipe"
          defaultDate={todayIn(ctx.timezone)}
          recipe={{ id: recipe.id, title: recipe.title }}
          recipes={recipes}
          members={members}
        />
      </div>

      <section aria-labelledby="ingredients-heading" className="mb-8">
        <h2 id="ingredients-heading" className="mb-3 font-semibold">
          재료 {recipe.ingredients.length > 0 && recipe.ingredients.length}
        </h2>
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-muted-foreground">적어 둔 재료가 없어요.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {recipe.ingredients.map((item) => (
              <li key={item.id} className="flex items-baseline gap-3 px-4 py-2.5">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm">{formatQuantity(item.quantity, item.unit)}</span>
                {item.note && (
                  <span className="ml-auto text-sm text-muted-foreground">{item.note}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="steps-heading" className="mb-8">
        <h2 id="steps-heading" className="mb-3 font-semibold">
          조리 순서
        </h2>
        {recipe.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">적어 둔 순서가 없어요.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5 whitespace-pre-line">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canArchiveRecipe({ id: ctx.memberId, role: ctx.role }, recipe) && (
        <section className="border-t pt-6">
          <ConfirmActionButton
            action={archiveRecipeAction}
            fields={{ recipeId: recipe.id }}
            triggerLabel="이 레시피 보관"
            title={`'${recipe.title}' 레시피를 보관할까요?`}
            description="레시피 목록에서 사라져요. 이미 짠 식단의 메뉴 이름은 그대로 남아요."
            confirmLabel="보관"
            destructive
            triggerSize="default"
          />
        </section>
      )}
    </>
  );
}
