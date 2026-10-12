import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { BookOpen, Clock, Plus, Search } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CookingTabs } from '@/modules/cooking/components/cooking-tabs';
import { listRecipes, listRecipeTags } from '@/modules/cooking/recipe/queries';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '레시피' };

const recipesHref = (params: { q?: string; tag?: string }) => {
  const search = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  return (search ? `/cooking/recipes?${search}` : '/cooking/recipes') as Route;
};

export default async function RecipesPage({ searchParams }: PageProps<'/cooking/recipes'>) {
  const ctx = await requireMember();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 40) : '';
  const tag = typeof params.tag === 'string' ? params.tag : '';
  const [recipes, tags] = await Promise.all([listRecipes(ctx, { q, tag }), listRecipeTags(ctx)]);
  const filtered = Boolean(q || tag);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="요리" description="우리 집 레시피를 한곳에 모아요." />
        <Link href="/cooking/recipes/new" className={buttonVariants({ className: 'h-10 px-3' })}>
          <Plus aria-hidden />
          레시피 추가
        </Link>
      </div>
      <div className="mb-6">
        <CookingTabs current="recipes" />
      </div>

      <form role="search" action="/cooking/recipes" className="mb-3 flex gap-2">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <Input
          name="q"
          type="search"
          defaultValue={q}
          aria-label="레시피 검색"
          placeholder="요리 이름이나 재료로 찾기 (예: 양파)"
          className="h-10"
        />
        <Button type="submit" variant="outline" className="h-10" aria-label="찾기">
          <Search aria-hidden />
        </Button>
      </form>
      {tags.length > 0 && (
        <nav aria-label="태그" className="mb-6 flex flex-wrap gap-1.5">
          {tags.map((name) => (
            <Link
              key={name}
              href={recipesHref({ q, tag: name === tag ? undefined : name })}
              aria-current={name === tag ? 'true' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                name === tag && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {name}
            </Link>
          ))}
        </nav>
      )}

      {recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={filtered ? '찾는 레시피가 없어요' : '아직 레시피가 없어요'}
          description={
            filtered
              ? '다른 이름이나 재료로 찾아보세요.'
              : '자주 해 먹는 요리를 하나 넣어 보세요. 재료는 식단에서 장보기로 바로 옮길 수 있어요.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/cooking/recipes/${recipe.id}` as Route}
                className="flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{recipe.title}</span>
                {(recipe.cookMinutes || recipe.servings) && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {recipe.cookMinutes && (
                      <>
                        <Clock className="size-3.5" aria-hidden />
                        {recipe.cookMinutes}분
                      </>
                    )}
                    {recipe.cookMinutes && recipe.servings && ' · '}
                    {recipe.servings && `${recipe.servings}인분`}
                  </span>
                )}
                {recipe.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {recipe.tags.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
