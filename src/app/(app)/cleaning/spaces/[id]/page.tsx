import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { TaskBoard } from '@/modules/cleaning/components/task-board';
import { getSpaceBoard } from '@/modules/cleaning/queries';
import { requireMember } from '@/modules/core/auth-context';
import { listActiveMembers } from '@/modules/core/household/queries';
import { getSpace } from '@/modules/core/space/queries';

export const metadata: Metadata = { title: '공간' };

/** 'none' = 공간을 정하지 않은 할 일 */
const NO_SPACE = 'none';

export default async function SpaceDetailPage({ params }: PageProps<'/cleaning/spaces/[id]'>) {
  const ctx = await requireMember();
  const { id } = await params;
  let space: { id: string; name: string; icon: string | null } | null = null;
  if (id !== NO_SPACE) {
    if (!z.uuid().safeParse(id).success) notFound();
    space = await getSpace(ctx, id);
    if (!space) notFound();
  }

  const [board, members] = await Promise.all([
    getSpaceBoard(ctx, space?.id ?? null),
    listActiveMembers(ctx),
  ]);
  const isEmpty = Object.values(board.sections).every((tasks) => tasks.length === 0);
  const title = space ? [space.icon, space.name].filter(Boolean).join(' ') : '공간 없음';
  const newTaskHref = (
    space ? `/cleaning/tasks/new?spaceId=${space.id}` : '/cleaning/tasks/new'
  ) as Route;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={title} back={{ href: '/cleaning/spaces', label: '공간별' }} />
        <Link href={newTaskHref} className={buttonVariants({ className: 'mt-7 h-10 px-3' })}>
          <Plus aria-hidden />할 일 추가
        </Link>
      </div>
      {isEmpty ? (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          이 공간에는 아직 할 일이 없어요.
        </p>
      ) : (
        <TaskBoard
          sections={board.sections}
          today={board.today}
          timezone={ctx.timezone}
          members={members}
          myMemberId={ctx.memberId}
          showSpace={false}
        />
      )}
    </>
  );
}
