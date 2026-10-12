import type { LocalDate } from '@/lib/local-date';
import { dueStatus, type DueStatus, type Recurrence } from '@/modules/core/task/recurrence';

// 할 일 화면 묶기 · 공간별 요약. DB와 무관한 순수 함수라 단위 테스트로 검증한다.

type BoardTask = {
  title: string;
  recurrence: Recurrence;
  nextDueDate: LocalDate | null;
  lastCompletedAt: Date | null;
  assigneeMemberId: string | null;
  spaceId: string | null;
};

export const BOARD_SECTIONS: readonly { status: DueStatus; title: string; collapsed?: boolean }[] =
  [
    { status: 'overdue', title: '밀린 일' },
    { status: 'today', title: '오늘' },
    { status: 'this_week', title: '이번 주' },
    { status: 'no_due', title: '기한 없음' },
    { status: 'later', title: '나중에', collapsed: true },
    { status: 'done', title: '완료됨', collapsed: true },
  ];

/** 완료한 1회성 할 일은 이 기간만 '완료됨'에 보여 준다 */
const DONE_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000;

/** '내 담당': 나에게 맡겨진 일 + 누구나 할 수 있는 일 */
export function isMine(task: { assigneeMemberId: string | null }, memberId: string): boolean {
  return task.assigneeMemberId === null || task.assigneeMemberId === memberId;
}

export function buildBoard<T extends BoardTask>(
  tasks: T[],
  options: { today: LocalDate; now: Date; onlyFor?: string },
): Record<DueStatus, T[]> {
  const board: Record<DueStatus, T[]> = {
    overdue: [],
    today: [],
    this_week: [],
    later: [],
    no_due: [],
    done: [],
  };
  for (const task of tasks) {
    if (options.onlyFor && !isMine(task, options.onlyFor)) continue;
    const status = dueStatus(task, options.today);
    if (
      status === 'done' &&
      options.now.getTime() - task.lastCompletedAt!.getTime() > DONE_VISIBLE_MS
    ) {
      continue;
    }
    board[status].push(task);
  }

  const byDue = (a: T, b: T) =>
    (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '') ||
    a.title.localeCompare(b.title, 'ko');
  for (const status of ['overdue', 'today', 'this_week', 'later'] as const) {
    board[status].sort(byDue);
  }
  board.no_due.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  board.done.sort((a, b) => b.lastCompletedAt!.getTime() - a.lastCompletedAt!.getTime());
  return board;
}

export type SpaceSummary = {
  /** null = 공간 없음 */
  id: string | null;
  name: string;
  icon: string | null;
  taskCount: number;
  overdueCount: number;
  todayCount: number;
  /** 가장 오래 안 한 일 (한 번도 안 한 일이 먼저) */
  stalest: { title: string; lastCompletedAt: Date | null } | null;
};

export function summarizeSpaces<T extends BoardTask>(
  spaces: { id: string; name: string; icon: string | null }[],
  tasks: T[],
  today: LocalDate,
): SpaceSummary[] {
  const open = tasks.filter((task) => dueStatus(task, today) !== 'done');
  const summarize = (
    id: string | null,
    name: string,
    icon: string | null,
    inSpace: T[],
  ): SpaceSummary => {
    const statuses = inSpace.map((task) => dueStatus(task, today));
    const stalest = inSpace
      .filter((task) => task.recurrence.type !== 'once')
      .sort(
        (a, b) =>
          (a.lastCompletedAt?.getTime() ?? -Infinity) - (b.lastCompletedAt?.getTime() ?? -Infinity),
      )[0];
    return {
      id,
      name,
      icon,
      taskCount: inSpace.length,
      overdueCount: statuses.filter((status) => status === 'overdue').length,
      todayCount: statuses.filter((status) => status === 'today').length,
      stalest: stalest ? { title: stalest.title, lastCompletedAt: stalest.lastCompletedAt } : null,
    };
  };

  const summaries = spaces.map((space) =>
    summarize(
      space.id,
      space.name,
      space.icon,
      open.filter((task) => task.spaceId === space.id),
    ),
  );
  const knownIds = new Set(spaces.map((space) => space.id));
  const withoutSpace = open.filter((task) => !task.spaceId || !knownIds.has(task.spaceId));
  if (withoutSpace.length > 0) summaries.push(summarize(null, '공간 없음', null, withoutSpace));
  return summaries;
}
