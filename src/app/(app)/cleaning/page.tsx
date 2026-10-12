import type { Metadata } from 'next';
import Link from 'next/link';
import { ListChecks, Plus, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { CleaningTabs, MineFilter } from '@/modules/cleaning/components/cleaning-nav';
import { TaskBoard } from '@/modules/cleaning/components/task-board';
import { getCleaningBoard } from '@/modules/cleaning/queries';
import { requireMember } from '@/modules/core/auth-context';
import { listActiveMembers } from '@/modules/core/household/queries';

export const metadata: Metadata = { title: '청소' };

export default async function CleaningPage({ searchParams }: PageProps<'/cleaning'>) {
  const ctx = await requireMember();
  const mine = (await searchParams).view === 'mine';
  const [board, members] = await Promise.all([
    getCleaningBoard(ctx, { mine }),
    listActiveMembers(ctx),
  ]);
  const isEmpty = Object.values(board.sections).every((tasks) => tasks.length === 0);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="청소" description="반복되는 청소와 정리 일을 함께 챙겨요." />
        <Link href="/cleaning/tasks/new" className={buttonVariants({ className: 'h-10 px-3' })}>
          <Plus aria-hidden />할 일 추가
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <CleaningTabs current="tasks" />
        {board.totalCount > 0 && <MineFilter mine={mine} />}
      </div>

      {board.totalCount === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            icon={Sparkles}
            title="아직 등록한 할 일이 없어요"
            description="추천 청소 목록에서 골라 한 번에 등록하거나, 직접 추가해 보세요."
          />
          <Link href="/cleaning/setup" className={buttonVariants({ className: 'h-11 px-5' })}>
            추천 할 일 고르기
          </Link>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={ListChecks}
          title={mine ? '내 담당인 할 일이 없어요' : '할 일이 없어요'}
          description={mine ? '전체 보기에서 다른 가족의 할 일을 볼 수 있어요.' : undefined}
        />
      ) : (
        <TaskBoard
          sections={board.sections}
          today={board.today}
          timezone={ctx.timezone}
          members={members}
          myMemberId={ctx.memberId}
        />
      )}

      {board.totalCount > 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/cleaning/setup" className="underline underline-offset-4">
            추천 할 일 더 고르기
          </Link>
        </p>
      )}
    </>
  );
}
