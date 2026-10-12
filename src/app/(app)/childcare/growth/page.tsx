import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { todayIn } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { describeAgeOn } from '@/modules/childcare/child/age';
import { listChildren, pickChild } from '@/modules/childcare/child/queries';
import { ChildcareNav } from '@/modules/childcare/components/childcare-tabs';
import { GrowthChart } from '@/modules/childcare/growth/components/growth-chart';
import {
  MeasurementDialog,
  MilestoneDialog,
} from '@/modules/childcare/growth/components/growth-dialogs';
import {
  chartPoints,
  formatDelta,
  formatMeasure,
  GROWTH_METRICS,
  withDeltas,
} from '@/modules/childcare/growth/growth';
import { listGrowthRecords, listMilestones } from '@/modules/childcare/growth/queries';
import { formatEventDate } from '@/modules/childcare/health/status';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '성장 기록' };

export default async function GrowthPage({ searchParams }: PageProps<'/childcare/growth'>) {
  const ctx = await requireMember();
  const children = await listChildren(ctx);
  if (children.length === 0) redirect('/childcare');
  const { child: childParam } = await searchParams;
  const child = pickChild(children, childParam)!;
  const today = todayIn(ctx.timezone);

  if (!child.birthDate) {
    return (
      <>
        <PageHeader title="육아" />
        <ChildcareNav current="growth" childList={children} selectedId={child.id} />
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          태어나면 키 · 몸무게 · 머리둘레와 첫 뒤집기 같은 발달 기록을 남길 수 있어요.
        </p>
      </>
    );
  }

  const birthDate = child.birthDate;
  const [records, milestones] = await Promise.all([
    listGrowthRecords(ctx, child.id),
    listMilestones(ctx, child.id),
  ]);
  const rows = withDeltas(records).reverse();
  const dateOf = (date: string) => formatEventDate(date, today);
  const ageAt = (date: string) => describeAgeOn(birthDate, date);

  return (
    <>
      <PageHeader title="육아" />
      <ChildcareNav current="growth" childList={children} selectedId={child.id} />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="growth-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="growth-heading" className="font-semibold">
              키 · 몸무게
            </h2>
            <MeasurementDialog childId={child.id} today={today} />
          </div>
          {records.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {GROWTH_METRICS.map(({ key, label }) => (
                <GrowthChart
                  key={key}
                  label={label}
                  metric={key}
                  points={chartPoints(records, birthDate, key)}
                />
              ))}
            </div>
          )}
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              아직 측정 기록이 없어요. 병원 · 검진에서 잰 값을 남겨 두세요.
            </p>
          ) : (
            <ul aria-label="측정 기록" className="divide-y rounded-xl border">
              {rows.map((row) => (
                <li
                  key={row.id}
                  aria-label={dateOf(row.measuredOn)}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {dateOf(row.measuredOn)} · {ageAt(row.measuredOn)}
                      {row.note && ` · ${row.note}`}
                    </p>
                    <p className="flex flex-wrap gap-x-3">
                      {GROWTH_METRICS.map(({ key, label }) => {
                        const value = row[key];
                        if (value === null) return null;
                        const delta = row.deltas[key];
                        return (
                          <span key={key} className="whitespace-nowrap">
                            <span className="sr-only">{label} </span>
                            {key === 'headCm' && (
                              <span aria-hidden className="text-muted-foreground">
                                머리{' '}
                              </span>
                            )}
                            {formatMeasure(value, key)}
                            {delta !== null && (
                              <span
                                className={cn(
                                  'ml-1 text-sm',
                                  delta < 0 ? 'text-destructive' : 'text-muted-foreground',
                                )}
                              >
                                ({formatDelta(delta, key)})
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <MeasurementDialog record={row} today={today} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="milestone-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="milestone-heading" className="font-semibold">
              발달 기록
            </h2>
            <MilestoneDialog childId={child.id} today={today} />
          </div>
          {milestones.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              첫 미소 · 뒤집기 같은 순간을 날짜와 함께 남겨 두세요.
            </p>
          ) : (
            <ul aria-label="발달 기록" className="divide-y rounded-xl border">
              {milestones.map((item) => (
                <li
                  key={item.id}
                  aria-label={item.title}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <span aria-hidden className="pt-0.5">
                    ⭐
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {dateOf(item.achievedOn)} · {ageAt(item.achievedOn)}
                      {item.recordedByName && ` · ${item.recordedByName}`}
                    </p>
                    {item.note && (
                      <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <MilestoneDialog milestone={item} today={today} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
