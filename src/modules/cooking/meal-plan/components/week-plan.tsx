import type { Route } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatShortDate, weekDates, type LocalDate } from '@/lib/local-date';
import { MemberChip } from '@/modules/core/household/components/member-chip';
import type { ActiveMember } from '@/modules/core/household/queries';
import { MEAL_KIND_LABELS, MEAL_TYPE_LABELS, MEAL_TYPES, type MealKind } from '../../constants';
import type { MealPlanItem } from '../queries';
import { AddEntryDialog } from './add-entry-dialog';
import { RemoveEntryButton } from './entry-buttons';

type WeekPlanProps = {
  monday: LocalDate;
  today: LocalDate;
  entries: MealPlanItem[];
  recipes: { id: string; title: string }[];
  members: ActiveMember[];
};

/**
 * 한 주 식단 (docs/modules/cooking.md 4.1절). 날짜별 카드 목록.
 * 이번 주에는 오늘부터 위에 보여 주고, 지난 날은 아래에 접어 둔다.
 */
export function WeekPlan({ monday, today, entries, recipes, members }: WeekPlanProps) {
  const days = weekDates(monday);
  const upcoming = days.filter((date) => date >= today);
  const past = days.filter((date) => date < today);
  const isCurrentWeek = upcoming.length > 0 && past.length > 0;

  const renderDay = (date: LocalDate) => (
    <DayCard
      key={date}
      date={date}
      isToday={date === today}
      entries={entries.filter((entry) => entry.date === date)}
      recipes={recipes}
      members={members}
    />
  );

  if (!isCurrentWeek) return <div className="flex flex-col gap-3">{days.map(renderDay)}</div>;
  return (
    <div className="flex flex-col gap-3">
      {upcoming.map(renderDay)}
      <details className="group mt-3">
        <summary className="w-fit cursor-pointer list-none font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90"
              aria-hidden
            />
            이번 주 지난 날 {past.length}
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">{past.map(renderDay)}</div>
      </details>
    </div>
  );
}

function DayCard({
  date,
  isToday,
  entries,
  recipes,
  members,
}: {
  date: LocalDate;
  isToday: boolean;
  entries: MealPlanItem[];
  recipes: { id: string; title: string }[];
  members: ActiveMember[];
}) {
  const headingId = `day-${date}`;
  const meals = MEAL_TYPES.map((mealType) => ({
    mealType,
    items: entries.filter((entry) => entry.mealType === mealType),
  })).filter((meal) => meal.items.length > 0);

  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-xl border p-4', isToday && 'border-primary/50 bg-primary/[0.03]')}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="flex items-center gap-2 font-semibold">
          {formatShortDate(date)}
          {isToday && <Badge>오늘</Badge>}
        </h2>
        <AddEntryDialog date={date} defaultDate={date} recipes={recipes} members={members} />
      </div>
      {meals.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">아직 정하지 않았어요.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-[3rem_1fr] gap-x-3 gap-y-2">
          {meals.map(({ mealType, items }) => (
            <div key={mealType} className="contents">
              <dt className="pt-1.5 text-sm text-muted-foreground">{MEAL_TYPE_LABELS[mealType]}</dt>
              <dd>
                <ul className="flex flex-col">
                  {items.map((entry) => (
                    <MealEntryRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function MealEntryRow({ entry }: { entry: MealPlanItem }) {
  const kindLabel = entry.kind !== 'home' ? MEAL_KIND_LABELS[entry.kind as MealKind] : null;
  return (
    <li className="flex min-h-9 items-center gap-2" aria-label={entry.title}>
      {entry.recipeId ? (
        <Link
          href={`/cooking/recipes/${entry.recipeId}` as Route}
          className="min-w-0 truncate underline-offset-4 hover:underline"
        >
          {entry.title}
        </Link>
      ) : (
        <span className="min-w-0 truncate">{entry.title}</span>
      )}
      {kindLabel && kindLabel !== entry.title && <Badge variant="secondary">{kindLabel}</Badge>}
      {entry.cookName && entry.cookColor && (
        <MemberChip member={{ displayName: entry.cookName, color: entry.cookColor }} />
      )}
      <span className="ml-auto">
        <RemoveEntryButton entryId={entry.id} title={entry.title} />
      </span>
    </li>
  );
}
