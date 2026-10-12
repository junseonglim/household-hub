import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { z } from 'zod';
import { ConfirmActionButton } from '@/components/form/confirm-action-button';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { formatDaysAgo, formatShortDate, localDateOf, todayIn } from '@/lib/local-date';
import { archiveTaskAction, undoCompletionAction } from '@/modules/cleaning/actions';
import { CompleteDialog } from '@/modules/cleaning/components/complete-dialog';
import { QuickCompleteButton } from '@/modules/cleaning/components/quick-complete-button';
import { getCleaningTask, getCompletionHistory } from '@/modules/cleaning/queries';
import { requireMember } from '@/modules/core/auth-context';
import { MemberChip } from '@/modules/core/household/components/member-chip';
import { listActiveMembers } from '@/modules/core/household/queries';
import { canArchiveTask } from '@/modules/core/task/permissions';
import { describeDaysUntil, describeRecurrence, dueStatus } from '@/modules/core/task/recurrence';

export const metadata: Metadata = { title: '할 일' };

export default async function TaskDetailPage({ params }: PageProps<'/cleaning/tasks/[id]'>) {
  const ctx = await requireMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [task, history, members] = await Promise.all([
    getCleaningTask(ctx, id),
    getCompletionHistory(ctx, id),
    listActiveMembers(ctx),
  ]);
  if (!task) notFound();

  const today = todayIn(ctx.timezone);
  const status = dueStatus(task, today);
  const done = status === 'done';
  // 완료 취소는 가장 늦게 기록한 1건만 (docs/modules/cleaning.md 5절)
  const latest = history.reduce<(typeof history)[number] | undefined>(
    (found, item) => (!found || item.createdAt > found.createdAt ? item : found),
    undefined,
  );
  const clock = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ctx.timezone,
  });
  // '10/10 (토) 오후 8:00'
  const formatTime = (at: Date) =>
    `${formatShortDate(localDateOf(at, ctx.timezone))} ${clock.format(at)}`;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={task.title} back={{ href: '/cleaning', label: '청소' }} />
        <Link
          href={`/cleaning/tasks/${task.id}/edit` as Route}
          className={buttonVariants({ variant: 'outline', className: 'mt-7 h-9' })}
        >
          <Pencil aria-hidden />
          수정
        </Link>
      </div>

      <section aria-label="요약" className="mb-8 flex flex-col gap-4 rounded-xl border p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">다음 예정</dt>
          <dd className={status === 'overdue' ? 'font-medium text-destructive' : 'font-medium'}>
            {done
              ? '완료됨'
              : task.nextDueDate
                ? `${formatShortDate(task.nextDueDate)} · ${describeDaysUntil(task.nextDueDate, today)}`
                : '기한 없음'}
          </dd>
          <dt className="text-muted-foreground">반복</dt>
          <dd>{describeRecurrence(task.recurrence)}</dd>
          <dt className="text-muted-foreground">공간</dt>
          <dd>
            {task.spaceName ? [task.spaceIcon, task.spaceName].filter(Boolean).join(' ') : '없음'}
          </dd>
          <dt className="text-muted-foreground">담당</dt>
          <dd>
            <MemberChip
              member={
                task.assigneeName && task.assigneeColor
                  ? { displayName: task.assigneeName, color: task.assigneeColor }
                  : null
              }
            />
          </dd>
          <dt className="text-muted-foreground">마지막</dt>
          <dd>
            {task.lastCompletedAt
              ? formatDaysAgo(localDateOf(task.lastCompletedAt, ctx.timezone), today)
              : '아직 기록 없음'}
          </dd>
          {task.estimatedMinutes && (
            <>
              <dt className="text-muted-foreground">걸리는 시간</dt>
              <dd>{task.estimatedMinutes}분</dd>
            </>
          )}
          {task.note && (
            <>
              <dt className="text-muted-foreground">메모</dt>
              <dd className="whitespace-pre-line">{task.note}</dd>
            </>
          )}
        </dl>
        {!done && (
          <div className="flex flex-wrap gap-2">
            <QuickCompleteButton task={task} />
            <CompleteDialog
              task={task}
              members={members}
              myMemberId={ctx.memberId}
              timezone={ctx.timezone}
              trigger="button"
            />
          </div>
        )}
      </section>

      <section aria-labelledby="history-heading" className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="history-heading" className="font-semibold">
            완료 기록
          </h2>
          {latest && (
            <ConfirmActionButton
              action={undoCompletionAction}
              fields={{ completionId: latest.id }}
              triggerLabel="마지막 완료 취소"
              title="마지막 완료를 취소할까요?"
              description={`${latest.completedByName} · ${formatTime(latest.completedAt)} 기록을 지우고, 다음 예정일을 그 전으로 되돌려요.`}
              confirmLabel="완료 취소"
            />
          )}
        </div>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            아직 완료한 기록이 없어요.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {history.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <MemberChip
                    member={{ displayName: item.completedByName, color: item.completedByColor }}
                  />
                  <span>{formatTime(item.completedAt)}</span>
                  {item.dueDate && (
                    <span className="text-muted-foreground">
                      (예정 {formatShortDate(item.dueDate)})
                    </span>
                  )}
                </div>
                {item.note && <p className="text-muted-foreground">{item.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canArchiveTask({ id: ctx.memberId, role: ctx.role }, task) && (
        <section className="border-t pt-6">
          <ConfirmActionButton
            action={archiveTaskAction}
            fields={{ taskId: task.id }}
            triggerLabel="이 할 일 보관"
            title={`'${task.title}'을(를) 보관할까요?`}
            description="목록에서 사라져요. 지금까지의 완료 기록은 그대로 남아요."
            confirmLabel="보관"
            destructive
            triggerSize="default"
          />
        </section>
      )}
    </>
  );
}
