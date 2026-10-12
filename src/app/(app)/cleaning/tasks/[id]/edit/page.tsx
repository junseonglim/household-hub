import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { localDateOf, todayIn } from '@/lib/local-date';
import { updateTaskAction } from '@/modules/cleaning/actions';
import { TaskForm } from '@/modules/cleaning/components/task-form';
import { getCleaningTask } from '@/modules/cleaning/queries';
import { requireMember } from '@/modules/core/auth-context';
import { listActiveMembers } from '@/modules/core/household/queries';
import { listSpaces } from '@/modules/core/space/queries';

export const metadata: Metadata = { title: '할 일 수정' };

export default async function EditTaskPage({ params }: PageProps<'/cleaning/tasks/[id]/edit'>) {
  const ctx = await requireMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [task, spaces, members] = await Promise.all([
    getCleaningTask(ctx, id),
    listSpaces(ctx),
    listActiveMembers(ctx),
  ]);
  if (!task) notFound();

  return (
    <>
      <PageHeader
        title="할 일 수정"
        back={{ href: `/cleaning/tasks/${task.id}` as Route, label: task.title }}
      />
      <TaskForm
        action={updateTaskAction}
        initial={{
          taskId: task.id,
          nextDueDate: task.nextDueDate,
          lastCompletedOn: task.lastCompletedAt
            ? localDateOf(task.lastCompletedAt, ctx.timezone)
            : null,
          title: task.title,
          spaceId: task.spaceId,
          recurrence: task.recurrence,
          startDate: task.startDate,
          assigneeMemberId: task.assigneeMemberId,
          estimatedMinutes: task.estimatedMinutes,
          note: task.note,
        }}
        spaces={spaces}
        members={members}
        submitLabel="저장"
        today={todayIn(ctx.timezone)}
        editing
      />
    </>
  );
}
