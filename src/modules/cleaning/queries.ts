import { todayIn } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';
import { listSpaces } from '@/modules/core/space/queries';
import { getTask, listCompletions, listTasks } from '@/modules/core/task/queries';
import { buildBoard, summarizeSpaces } from './board';

// 청소 화면 조회. 할 일은 core 엔진의 module = 'cleaning' 범위만 읽는다.

const MODULE = 'cleaning';

export async function getCleaningBoard(ctx: MemberContext, { mine }: { mine: boolean }) {
  const tasks = await listTasks(ctx, MODULE);
  const today = todayIn(ctx.timezone);
  return {
    today,
    totalCount: tasks.length,
    sections: buildBoard(tasks, {
      today,
      now: new Date(),
      onlyFor: mine ? ctx.memberId : undefined,
    }),
  };
}

export async function getSpaceSummaries(ctx: MemberContext) {
  const [spaces, tasks] = await Promise.all([listSpaces(ctx), listTasks(ctx, MODULE)]);
  const today = todayIn(ctx.timezone);
  return { today, summaries: summarizeSpaces(spaces, tasks, today) };
}

/** 공간 하나의 할 일 (spaceId = null이면 공간 없는 할 일) */
export async function getSpaceBoard(ctx: MemberContext, spaceId: string | null) {
  const tasks = await listTasks(ctx, MODULE, { spaceId });
  const today = todayIn(ctx.timezone);
  return { today, sections: buildBoard(tasks, { today, now: new Date() }) };
}

export async function getCleaningTask(ctx: MemberContext, taskId: string) {
  return getTask(ctx, MODULE, taskId);
}

export async function getCompletionHistory(ctx: MemberContext, taskId: string) {
  return listCompletions(ctx, taskId);
}

/** 이미 등록한 할 일 제목 (처음 설정에서 중복을 피하려고) */
export async function listCleaningTaskTitles(ctx: MemberContext): Promise<Set<string>> {
  const tasks = await listTasks(ctx, MODULE);
  return new Set(tasks.map((task) => task.title));
}
