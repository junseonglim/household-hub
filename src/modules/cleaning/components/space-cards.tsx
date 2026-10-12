import type { Route } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatDaysAgo, localDateOf, type LocalDate } from '@/lib/local-date';
import type { SpaceSummary } from '../board';

/** 공간별 보기 카드 (docs/modules/cleaning.md 4.2절) */
export function SpaceCards({
  summaries,
  today,
  timezone,
}: {
  summaries: SpaceSummary[];
  today: LocalDate;
  timezone: string;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {summaries.map((summary) => {
        const stalest = summary.stalest;
        return (
          <li key={summary.id ?? 'none'}>
            <Link
              href={`/cleaning/spaces/${summary.id ?? 'none'}` as Route}
              aria-label={`${summary.name} 공간`}
              className="flex h-full items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <span aria-hidden className="text-2xl leading-none">
                {summary.icon ?? '📦'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{summary.name}</span>
                <span className="block text-sm text-muted-foreground">
                  할 일 {summary.taskCount}
                  {summary.overdueCount > 0 && (
                    <span className="font-medium text-destructive">
                      {' '}
                      · 밀림 {summary.overdueCount}
                    </span>
                  )}
                  {summary.todayCount > 0 && <> · 오늘 {summary.todayCount}</>}
                </span>
                {stalest && (
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                    가장 오래 안 한 일: {stalest.title} ·{' '}
                    {stalest.lastCompletedAt
                      ? formatDaysAgo(localDateOf(stalest.lastCompletedAt, timezone), today)
                      : '기록 없음'}
                  </span>
                )}
              </span>
              <ChevronRight className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
