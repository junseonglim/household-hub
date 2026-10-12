import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { Baby } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { todayIn } from '@/lib/local-date';
import {
  AgeCard,
  PregnancyCard,
  PrepProgressCard,
} from '@/modules/childcare/child/components/child-cards';
import { RegisterChildForm } from '@/modules/childcare/child/components/child-forms';
import { getBirthMeasurement, listChildren, pickChild } from '@/modules/childcare/child/queries';
import { ChildcareNav, withChild } from '@/modules/childcare/components/childcare-tabs';
import { EventDialog } from '@/modules/childcare/health/components/event-dialog';
import { EventSection } from '@/modules/childcare/health/components/event-row';
import { listEvents } from '@/modules/childcare/health/queries';
import { upcomingHighlights } from '@/modules/childcare/health/status';
import { getPrepProgress } from '@/modules/childcare/prep/queries';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';

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

  const { child: childParam } = await searchParams;
  const child = pickChild(children, childParam)!;
  const childId = children.length > 1 ? child.id : null;
  const [events, prep, birthMeasurement] = await Promise.all([
    listEvents(ctx, child.id),
    child.birthDate ? null : getPrepProgress(ctx),
    getBirthMeasurement(ctx, child),
  ]);
  const highlights = upcomingHighlights(events, today, HIGHLIGHT_LIMIT);

  return (
    <>
      <PageHeader title="육아" />
      <ChildcareNav current="today" childList={children} selectedId={child.id} />

      <div className="flex flex-col gap-6">
        {child.birthDate ? (
          <AgeCard
            child={child}
            today={today}
            birthMeasurement={birthMeasurement}
            canEdit={isAdmin}
          />
        ) : (
          <PregnancyCard child={child} today={today} canEdit={isAdmin} />
        )}

        {prep && (
          <PrepProgressCard
            done={prep.done}
            total={prep.total}
            href={withChild(prep.total > 0 ? '/childcare/prep' : '/childcare/prep/setup', childId)}
          />
        )}

        <div className="flex flex-col gap-2">
          {highlights.length > 0 ? (
            <EventSection title="챙길 일정" groups={highlights} today={today} />
          ) : (
            <section aria-label="챙길 일정">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">챙길 일정</h2>
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                {child.birthDate
                  ? '다가오는 일정이 없어요.'
                  : '산부인과 검진 · 조리원 투어 같은 일정을 넣어 두면 가족이 함께 볼 수 있어요.'}
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

        {child.birthDate ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            수유 · 기저귀 · 수면 기록과 성장 기록은 곧 여기에 생겨요.
          </p>
        ) : (
          isAdmin && (
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
          )
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
