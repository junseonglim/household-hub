import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { todayIn, weekdayOf } from '@/lib/local-date';
import { createTaskAction } from '@/modules/cleaning/actions';
import { TaskForm } from '@/modules/cleaning/components/task-form';
import { requireMember } from '@/modules/core/auth-context';
import { listActiveMembers } from '@/modules/core/household/queries';
import { listSpaces } from '@/modules/core/space/queries';
import type { Weekday } from '@/modules/core/task/recurrence';

export const metadata: Metadata = { title: '할 일 추가' };

export default async function NewTaskPage({ searchParams }: PageProps<'/cleaning/tasks/new'>) {
  const ctx = await requireMember();
  const { spaceId } = await searchParams;
  const [spaces, members] = await Promise.all([listSpaces(ctx), listActiveMembers(ctx)]);
  // 공간 화면에서 들어왔으면 그 공간을 미리 골라 둔다
  const preselected = spaces.find((space) => space.id === spaceId)?.id ?? null;
  const today = todayIn(ctx.timezone);

  return (
    <>
      <PageHeader title="할 일 추가" back={{ href: '/cleaning', label: '청소' }} />
      <TaskForm
        action={createTaskAction}
        initial={{
          title: '',
          spaceId: preselected,
          // 기본: 매주 오늘 요일
          recurrence: { type: 'weekly', weekdays: [weekdayOf(today) as Weekday] },
          startDate: today,
          assigneeMemberId: null,
          estimatedMinutes: null,
          note: null,
        }}
        spaces={spaces}
        members={members}
        submitLabel="등록"
        today={today}
      />
    </>
  );
}
