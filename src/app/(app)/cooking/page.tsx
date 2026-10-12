import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { addDays, formatShortDate, isValidLocalDate, startOfWeek, todayIn } from '@/lib/local-date';
import { CookingTabs } from '@/modules/cooking/components/cooking-tabs';
import { CopyWeekButton } from '@/modules/cooking/meal-plan/components/entry-buttons';
import { WeekPlan } from '@/modules/cooking/meal-plan/components/week-plan';
import { getWeekPlan } from '@/modules/cooking/meal-plan/queries';
import { listRecipeOptions } from '@/modules/cooking/recipe/queries';
import { requireMember } from '@/modules/core/auth-context';
import { listActiveMembers } from '@/modules/core/household/queries';

export const metadata: Metadata = { title: '요리' };

const weekHref = (monday: string) => `/cooking?week=${monday}` as Route;

export default async function CookingPage({ searchParams }: PageProps<'/cooking'>) {
  const ctx = await requireMember();
  const { week } = await searchParams;
  const today = todayIn(ctx.timezone);
  const thisMonday = startOfWeek(today);
  const monday =
    typeof week === 'string' && isValidLocalDate(week) ? startOfWeek(week) : thisMonday;

  const [entries, recipes, members] = await Promise.all([
    getWeekPlan(ctx, monday),
    listRecipeOptions(ctx),
    listActiveMembers(ctx),
  ]);

  return (
    <>
      <PageHeader title="요리" description="한 주 식단을 함께 짜고 장보기 목록을 나눠요." />
      <div className="mb-6">
        <CookingTabs current="meals" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="주 이동" className="flex items-center gap-1">
          <Link
            href={weekHref(addDays(monday, -7))}
            aria-label="지난주"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <h2 className="min-w-36 text-center font-semibold">
            {formatShortDate(monday)} ~ {formatShortDate(addDays(monday, 6))}
          </h2>
          <Link
            href={weekHref(addDays(monday, 7))}
            aria-label="다음 주"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ChevronRight aria-hidden />
          </Link>
          {monday !== thisMonday && (
            <Link href="/cooking" className="ml-1 text-sm underline underline-offset-4">
              이번 주
            </Link>
          )}
        </nav>
        <CopyWeekButton weekStart={monday} />
      </div>

      <WeekPlan
        monday={monday}
        today={today}
        entries={entries}
        recipes={recipes}
        members={members}
      />
    </>
  );
}
