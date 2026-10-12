import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { Baby } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { isValidLocalDate, todayIn, type LocalDate } from '@/lib/local-date';
import { CareDaySection } from '@/modules/childcare/care/components/care-day';
import { CareQuickActions } from '@/modules/childcare/care/components/care-entry';
import { CareStatusPanel, RunningTimers } from '@/modules/childcare/care/components/care-live';
import {
  getCareStatus,
  listCareForDay,
  listRecentMedicines,
} from '@/modules/childcare/care/queries';
import {
  AgeCard,
  PregnancyCard,
  PrepProgressCard,
} from '@/modules/childcare/child/components/child-cards';
import { RegisterChildForm } from '@/modules/childcare/child/components/child-forms';
import {
  getBirthMeasurement,
  listChildren,
  pickChild,
  type ChildItem,
} from '@/modules/childcare/child/queries';
import { ChildcareNav, withChild } from '@/modules/childcare/components/childcare-tabs';
import type { FeedingMethod } from '@/modules/childcare/constants';
import { EventDialog } from '@/modules/childcare/health/components/event-dialog';
import { EventSection } from '@/modules/childcare/health/components/event-row';
import { listEvents } from '@/modules/childcare/health/queries';
import { upcomingHighlights } from '@/modules/childcare/health/status';
import { getPrepProgress } from '@/modules/childcare/prep/queries';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';
import type { MemberContext } from '@/modules/core/member-context';

export const metadata: Metadata = { title: '육아' };

/** 오늘 화면에 보여 줄 가까운 일정 줄 수 */
const HIGHLIGHT_LIMIT = 4;

export default async function ChildcarePage({ searchParams }: PageProps<'/childcare'>) {
  const ctx = await requireMember();
  const isAdmin = canAdminister({ id: ctx.memberId, role: ctx.role });
  const today = todayIn(ctx.timezone);
  const children = await listChildren(ctx);

  if (children.length === 0) {
    return (
      <>
        <PageHeader title="육아" description="출산 준비부터 접종 · 검진 일정까지 함께 챙겨요." />
        {isAdmin ? (
          <section aria-label="아이 등록" className="rounded-xl border p-5">
            <h2 className="mb-1 text-lg font-semibold">아이를 등록해 주세요</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              태명과 출산 예정일만 있으면 시작할 수 있어요.
            </p>
            <RegisterChildForm today={today} />
          </section>
        ) : (
          <EmptyState
            icon={Baby}
            title="아직 등록한 아이가 없어요"
            description="관리자가 아이를 등록하면 여기에서 준비물과 일정을 함께 볼 수 있어요."
          />
        )}
      </>
    );
  }

  const { child: childParam, date: dateParam } = await searchParams;
  const child = pickChild(children, childParam)!;
  const childId = children.length > 1 ? child.id : null;

  return (
    <>
      <PageHeader title="육아" />
      <ChildcareNav current="today" childList={children} selectedId={child.id} />
      <div className="flex flex-col gap-6">
        {child.birthDate ? (
          <BornToday
            ctx={ctx}
            child={child}
            birthDate={child.birthDate}
            today={today}
            dateParam={dateParam}
            childId={childId}
            isAdmin={isAdmin}
          />
        ) : (
          <ExpectingToday
            ctx={ctx}
            child={child}
            today={today}
            childId={childId}
            isAdmin={isAdmin}
          />
        )}
        {isAdmin && (
          <Link
            href="/childcare/child/new"
            className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            아이 한 명 더 등록
          </Link>
        )}
      </div>
    </>
  );
}

type TodayProps = {
  ctx: MemberContext;
  child: ChildItem;
  today: LocalDate;
  childId: string | null;
  isAdmin: boolean;
};

/** 출산 전: D-day · 준비 진행률 · 챙길 일정 · [태어났어요] */
async function ExpectingToday({ ctx, child, today, childId, isAdmin }: TodayProps) {
  const [events, prep] = await Promise.all([listEvents(ctx, child.id), getPrepProgress(ctx)]);
  return (
    <>
      <PregnancyCard child={child} today={today} canEdit={isAdmin} />
      <PrepProgressCard
        done={prep.done}
        total={prep.total}
        href={withChild(prep.total > 0 ? '/childcare/prep' : '/childcare/prep/setup', childId)}
      />
      <ScheduleHighlights
        events={events}
        child={child}
        today={today}
        childId={childId}
        empty="산부인과 검진 · 조리원 투어 같은 일정을 넣어 두면 가족이 함께 볼 수 있어요."
      />
      {isAdmin && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            태어나면 생년월일로 예방접종 · 검진 · 출생신고 일정을 만들어 드려요.
          </p>
          <Link
            href={`/childcare/child/${child.id}/born` as Route}
            className={buttonVariants({ className: 'h-11 px-6' })}
          >
            태어났어요 🎉
          </Link>
        </div>
      )}
    </>
  );
}

/**
 * 태어난 뒤: 기록 버튼 · 진행 중 타이머 · 마지막 수유/대변 · 하루 합계 · 타임라인 · 챙길 일정
 * (docs/modules/childcare.md 4.2절). 지난 날(`?date=`)에는 합계와 타임라인만.
 */
async function BornToday({
  ctx,
  child,
  birthDate,
  today,
  dateParam,
  childId,
  isAdmin,
}: TodayProps & { birthDate: LocalDate; dateParam: string | string[] | undefined }) {
  const date =
    typeof dateParam === 'string' &&
    isValidLocalDate(dateParam) &&
    dateParam <= today &&
    dateParam >= birthDate
      ? dateParam
      : today;
  const isToday = date === today;
  const now = new Date();
  const [records, status, medicines, events, birthMeasurement] = await Promise.all([
    listCareForDay(ctx, child.id, date),
    getCareStatus(ctx, child.id),
    listRecentMedicines(ctx, child.id),
    listEvents(ctx, child.id),
    getBirthMeasurement(ctx, child),
  ]);
  const lastMethod = (status.lastFeeding?.details as { method?: FeedingMethod } | undefined)
    ?.method;
  const hrefOf = (target: LocalDate) =>
    withChild(target === today ? '/childcare' : `/childcare?date=${target}`, childId);

  return (
    <>
      <AgeCard child={child} today={today} birthMeasurement={birthMeasurement} canEdit={isAdmin} />
      {isToday && (
        <>
          <CareQuickActions
            childId={child.id}
            timezone={ctx.timezone}
            nextSide={status.nextSide}
            lastMethod={lastMethod ?? null}
            recentMedicines={medicines}
          />
          <RunningTimers
            records={status.running}
            timezone={ctx.timezone}
            serverNow={now.getTime()}
          />
          <CareStatusPanel
            lastFeeding={status.lastFeeding}
            nextSide={status.nextSide}
            lastPoop={status.lastPoop}
            timezone={ctx.timezone}
            today={today}
            serverNow={now.getTime()}
          />
        </>
      )}
      <CareDaySection
        records={records}
        date={date}
        today={today}
        birthDate={birthDate}
        timezone={ctx.timezone}
        now={now}
        hrefOf={hrefOf}
      />
      <ScheduleHighlights
        events={events}
        child={child}
        today={today}
        childId={childId}
        empty="다가오는 일정이 없어요."
      />
    </>
  );
}

/** 챙길 일정: 놓친 것 → 지금 할 것 → 다가오는 것 몇 줄 + [일정 모두 보기] · [+ 일정] */
function ScheduleHighlights({
  events,
  child,
  today,
  childId,
  empty,
}: {
  events: Awaited<ReturnType<typeof listEvents>>;
  child: ChildItem;
  today: LocalDate;
  childId: string | null;
  empty: string;
}) {
  const highlights = upcomingHighlights(events, today, HIGHLIGHT_LIMIT);
  return (
    <div className="flex flex-col gap-2">
      {highlights.length > 0 ? (
        <EventSection title="챙길 일정" groups={highlights} today={today} />
      ) : (
        <section aria-label="챙길 일정">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">챙길 일정</h2>
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        </section>
      )}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={withChild('/childcare/schedule', childId)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          일정 모두 보기
        </Link>
        <EventDialog
          mode="add"
          childId={child.id}
          defaultDate={today}
          defaultKind={child.birthDate ? 'visit' : 'prenatal'}
        />
      </div>
    </div>
  );
}
