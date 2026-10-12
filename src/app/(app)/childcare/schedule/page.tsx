import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SegmentedLinks } from '@/components/segmented-links';
import { todayIn } from '@/lib/local-date';
import { listChildren, pickChild } from '@/modules/childcare/child/queries';
import { ChildcareNav, withChild } from '@/modules/childcare/components/childcare-tabs';
import { EventDialog } from '@/modules/childcare/health/components/event-dialog';
import { EventSection } from '@/modules/childcare/health/components/event-row';
import { listEvents } from '@/modules/childcare/health/queries';
import { buildScheduleView, singleGroups } from '@/modules/childcare/health/status';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '육아 일정' };

export default async function SchedulePage({ searchParams }: PageProps<'/childcare/schedule'>) {
  const ctx = await requireMember();
  const children = await listChildren(ctx);
  if (children.length === 0) redirect('/childcare');

  const { child: childParam, view: viewParam } = await searchParams;
  const child = pickChild(children, childParam)!;
  const childId = children.length > 1 ? child.id : null;
  const showPast = viewParam === 'past';
  const today = todayIn(ctx.timezone);
  const view = buildScheduleView(await listEvents(ctx, child.id), today);
  const pastCount = view.done.length + view.past.length + view.dismissed.length;

  return (
    <>
      <PageHeader title="육아" />
      <ChildcareNav current="schedule" childList={children} selectedId={child.id} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedLinks
          label="일정 보기"
          links={[
            {
              href: withChild('/childcare/schedule', childId),
              label: '다가오는 일정',
              active: !showPast,
            },
            {
              href: withChild('/childcare/schedule?view=past', childId),
              label: `지난 일정 ${pastCount}`,
              active: showPast,
            },
          ]}
        />
        <EventDialog
          mode="add"
          childId={child.id}
          defaultDate={today}
          defaultKind={child.birthDate ? 'visit' : 'prenatal'}
        />
      </div>

      {showPast ? (
        <div className="flex flex-col gap-6">
          <EventSection title="한 일정" groups={singleGroups(view.done, today)} today={today} />
          <EventSection title="지난 일정" groups={singleGroups(view.past, today)} today={today} />
          <EventSection
            title="해당 없음"
            groups={singleGroups(view.dismissed, today)}
            today={today}
          />
          {pastCount === 0 && (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              아직 지난 일정이 없어요.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <EventSection title="놓친 일정" groups={view.missed} today={today} tone="warning" />
          <EventSection title="지금 할 일정" groups={view.due} today={today} />
          <EventSection title="다가오는 일정 (두 달 안)" groups={view.soon} today={today} />
          {view.later.length > 0 && (
            <details className="group">
              <summary className="w-fit cursor-pointer list-none font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1">
                  <ChevronRight
                    className="size-4 transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                  그 뒤 일정 {view.later.reduce((sum, group) => sum + group.events.length, 0)}
                </span>
              </summary>
              <div className="mt-3">
                <EventSection title="그 뒤 일정" groups={view.later} today={today} />
              </div>
            </details>
          )}
          {view.missed.length + view.due.length + view.soon.length + view.later.length === 0 && (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {child.birthDate
                ? '다가오는 일정이 없어요.'
                : '산부인과 검진 · 조리원 투어 같은 일정을 넣어 보세요. 태어나면 접종 · 검진 일정이 자동으로 생겨요.'}
            </p>
          )}
          {child.birthDate && (
            <p className="text-xs text-muted-foreground">
              접종 · 검진 일정은 질병관리청 표준 일정을 바탕으로 한 참고용이에요. 맞히기 전에
              소아과나 예방접종도우미(nip.kdca.go.kr)에서 확인하세요. 출생신고 · 지원금 기한은
              복지로 · 정부24에서 확인하세요.
            </p>
          )}
        </div>
      )}
    </>
  );
}
