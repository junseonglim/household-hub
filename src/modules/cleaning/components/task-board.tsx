import { ChevronRight } from 'lucide-react';
import { formatDaysAgo, localDateOf, type LocalDate } from '@/lib/local-date';
import type { ActiveMember } from '@/modules/core/household/queries';
import { describeDue, describeRecurrence, type DueStatus } from '@/modules/core/task/recurrence';
import type { TaskListItem } from '@/modules/core/task/queries';
import { BOARD_SECTIONS } from '../board';
import { TaskRow, type TaskRowData } from './task-row';

type BoardContext = {
  today: LocalDate;
  timezone: string;
  members: ActiveMember[];
  myMemberId: string;
  /** 공간 화면에서는 공간 이름을 빼고 보여 준다 */
  showSpace?: boolean;
};

/** 묶음에 따라 한 줄 정보를 고른다 (docs/modules/cleaning.md 4.1절 화면 예시) */
function toRow(task: TaskListItem, status: DueStatus, context: BoardContext): TaskRowData {
  const meta: TaskRowData['meta'] = [];
  if (context.showSpace !== false && task.spaceName) {
    meta.push({ text: [task.spaceIcon, task.spaceName].filter(Boolean).join(' ') });
  }
  const rule = describeRecurrence(task.recurrence);
  switch (status) {
    case 'overdue':
      meta.push(
        { text: describeDue(task.nextDueDate, context.today), urgent: true },
        { text: rule },
      );
      break;
    case 'today':
    case 'no_due':
      meta.push({ text: rule });
      break;
    case 'this_week':
    case 'later':
      meta.push({ text: describeDue(task.nextDueDate, context.today) });
      break;
    case 'done':
      meta.push({
        text: `완료 · ${formatDaysAgo(localDateOf(task.lastCompletedAt!, context.timezone), context.today)}`,
      });
      break;
  }
  return {
    id: task.id,
    title: task.title,
    nextDueDate: task.nextDueDate,
    done: status === 'done',
    meta,
    assignee:
      task.assigneeName && task.assigneeColor
        ? { displayName: task.assigneeName, color: task.assigneeColor }
        : null,
  };
}

function TaskList({
  tasks,
  status,
  context,
}: {
  tasks: TaskListItem[];
  status: DueStatus;
  context: BoardContext;
}) {
  return (
    <ul className="divide-y rounded-xl border px-2">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={toRow(task, status, context)}
          members={context.members}
          myMemberId={context.myMemberId}
          timezone={context.timezone}
        />
      ))}
    </ul>
  );
}

/** 밀린 일 · 오늘 · 이번 주 … 묶음. 비어 있는 묶음은 그리지 않는다. */
export function TaskBoard({
  sections,
  ...context
}: BoardContext & { sections: Record<DueStatus, TaskListItem[]> }) {
  return (
    <div className="flex flex-col gap-6">
      {BOARD_SECTIONS.map(({ status, title, collapsed }) => {
        const tasks = sections[status];
        if (tasks.length === 0) return null;
        const headingId = `section-${status}`;

        if (collapsed) {
          return (
            <details key={status} className="group">
              <summary className="w-fit cursor-pointer list-none font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1">
                  <ChevronRight
                    className="size-4 transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                  {title} {tasks.length}
                </span>
              </summary>
              <div className="mt-3">
                <TaskList tasks={tasks} status={status} context={context} />
              </div>
            </details>
          );
        }
        return (
          <section key={status} aria-labelledby={headingId}>
            <h2
              id={headingId}
              className={
                status === 'overdue' ? 'mb-3 font-semibold text-destructive' : 'mb-3 font-semibold'
              }
            >
              {title} {tasks.length}
            </h2>
            <TaskList tasks={tasks} status={status} context={context} />
          </section>
        );
      })}
    </div>
  );
}
