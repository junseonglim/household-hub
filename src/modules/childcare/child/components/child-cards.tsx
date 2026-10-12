import type { Route } from 'next';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { formatFullDate, type LocalDate } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { SEX_LABELS, type Sex } from '../../constants';
import {
  ageOf,
  describeAge,
  describePregnancy,
  formatDday,
  nextCelebration,
  pregnancyOf,
} from '../age';
import type { ChildItem } from '../queries';

function EditChildLink({ child }: { child: ChildItem }) {
  return (
    <Link
      href={`/childcare/child/${child.id}` as Route}
      aria-label={`${child.name} 정보 고치기`}
      className={buttonVariants({
        variant: 'ghost',
        size: 'icon-sm',
        className: 'text-muted-foreground',
      })}
    >
      <Pencil aria-hidden />
    </Link>
  );
}

const sexLabel = (sex: string | null) => (sex ? SEX_LABELS[sex as Sex] : null);

/** 출산 전: 태명 · D-day · 임신 주수 · 예정일 */
export function PregnancyCard({
  child,
  today,
  canEdit,
}: {
  child: ChildItem;
  today: LocalDate;
  canEdit: boolean;
}) {
  const pregnancy = child.dueDate ? pregnancyOf(child.dueDate, today) : null;
  return (
    <section
      aria-label={child.name}
      className="rounded-xl border border-primary/30 bg-primary/[0.04] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <span aria-hidden>🤰 </span>
          {child.name}
        </h2>
        <div className="flex items-center gap-1">
          {pregnancy && (
            <p className="text-right">
              <span className="block text-xs text-muted-foreground">출산까지</span>
              <span className="text-2xl font-bold tracking-tight text-primary">
                {formatDday(pregnancy.daysLeft)}
              </span>
            </p>
          )}
          {canEdit && <EditChildLink child={child} />}
        </div>
      </div>
      {pregnancy && child.dueDate && (
        <p className="mt-1 text-sm text-muted-foreground">
          {describePregnancy(pregnancy)} · 예정일 {formatFullDate(child.dueDate)}
          {sexLabel(child.sex) && ` · ${sexLabel(child.sex)}`}
        </p>
      )}
    </section>
  );
}

/** 태어난 뒤: 생후 N일 · 출생 정보 · 다가오는 기념일 */
export function AgeCard({
  child,
  today,
  birthMeasurement,
  canEdit,
}: {
  child: ChildItem;
  today: LocalDate;
  birthMeasurement: { weightKg: number | null; heightCm: number | null } | null;
  canEdit: boolean;
}) {
  const birthDate = child.birthDate!;
  const celebration = nextCelebration(birthDate, today);
  const birthInfo = [
    `${formatFullDate(birthDate)} 출생`,
    sexLabel(child.sex),
    birthMeasurement?.weightKg != null && `${birthMeasurement.weightKg}kg`,
    birthMeasurement?.heightCm != null && `${birthMeasurement.heightCm}cm`,
  ].filter(Boolean);

  return (
    <section
      aria-label={child.name}
      className="rounded-xl border border-primary/30 bg-primary/[0.04] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            <span aria-hidden>👶 </span>
            {child.name}
          </h2>
          <p className="text-2xl font-bold tracking-tight text-primary">
            {describeAge(ageOf(birthDate, today))}
          </p>
        </div>
        {canEdit && <EditChildLink child={child} />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{birthInfo.join(' · ')}</p>
      {celebration && (
        <p
          className={cn(
            'mt-3 inline-flex rounded-full bg-background px-3 py-1 text-sm',
            celebration.daysLeft === 0 && 'font-semibold text-primary',
          )}
        >
          {celebration.daysLeft === 0
            ? `🎉 오늘 ${celebration.title}이에요`
            : `🎂 ${celebration.title}까지 ${formatDday(celebration.daysLeft)}`}
        </p>
      )}
    </section>
  );
}

/** 준비 23 / 47 + 진행 막대. href가 있으면 준비 화면으로 가는 링크 */
export function PrepProgressCard({
  done,
  total,
  href,
}: {
  done: number;
  total: number;
  href?: Route;
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <section aria-label="출산 준비" className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          출산 준비{' '}
          <span className="font-normal text-muted-foreground">
            {total > 0 ? `${done} / ${total}` : '아직 없어요'}
          </span>
        </h2>
        {href && (
          <Link href={href} className="text-sm text-primary underline-offset-4 hover:underline">
            {total > 0 ? '준비 보기' : '준비물 고르기'}
          </Link>
        )}
      </div>
      {total > 0 && (
        <div
          role="progressbar"
          aria-label="준비한 것"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      )}
    </section>
  );
}
