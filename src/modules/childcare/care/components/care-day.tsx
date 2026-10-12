import type { Route } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { addDays, formatShortDate, type LocalDate } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { dayBounds, describeDaySummary, summarizeDay, type CareRecord } from '../logic';
import { CareTimeline } from './care-live';

/**
 * 하루 기록: ◀ 날짜 ▶ · 합계(수유 · 기저귀 · 수면) · 타임라인.
 * 지난 날은 `?date=`로 본다 (태어난 날 ~ 오늘).
 */
export function CareDaySection({
  records,
  date,
  today,
  birthDate,
  timezone,
  now,
  hrefOf,
}: {
  records: CareRecord[];
  date: LocalDate;
  today: LocalDate;
  birthDate: LocalDate;
  timezone: string;
  now: Date;
  /** 그 날짜를 보는 주소 (오늘이면 date 없이) */
  hrefOf: (date: LocalDate) => Route;
}) {
  const isToday = date === today;
  const summary = describeDaySummary(summarizeDay(records, { ...dayBounds(date, timezone), now }));
  const navButton = buttonVariants({ variant: 'ghost', size: 'icon' });

  return (
    <section aria-labelledby="care-day-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <nav aria-label="날짜 이동" className="flex items-center gap-1">
          {date > birthDate ? (
            <Link href={hrefOf(addDays(date, -1))} aria-label="전날" className={navButton}>
              <ChevronLeft aria-hidden />
            </Link>
          ) : (
            <span className={cn(navButton, 'opacity-30')} aria-hidden>
              <ChevronLeft />
            </span>
          )}
          <h2 id="care-day-heading" className="min-w-28 text-center font-semibold">
            {isToday ? '오늘' : formatShortDate(date)}
          </h2>
          {isToday ? (
            <span className={cn(navButton, 'opacity-30')} aria-hidden>
              <ChevronRight />
            </span>
          ) : (
            <Link href={hrefOf(addDays(date, 1))} aria-label="다음 날" className={navButton}>
              <ChevronRight aria-hidden />
            </Link>
          )}
        </nav>
        {!isToday && (
          <Link href={hrefOf(today)} className="text-sm underline underline-offset-4">
            오늘로
          </Link>
        )}
      </div>
      <ul aria-label="하루 합계" className="grid gap-2 text-sm sm:grid-cols-3">
        {[
          ['🍼', summary.feeding],
          ['🧷', summary.diaper],
          ['😴', summary.sleep],
        ].map(([icon, text]) => (
          <li key={icon} className="rounded-lg bg-muted px-3 py-2">
            <span aria-hidden>{icon} </span>
            {text}
          </li>
        ))}
      </ul>
      <CareTimeline records={records} timezone={timezone} date={date} serverNow={now.getTime()} />
    </section>
  );
}
