import { and, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { householdMember, space, task, taskCompletion } from '@/db/schema';
import type { MemberContext } from '../member-context';
import type { TaskModule } from './service';

// 할 일 조회. 모든 쿼리는 가구 + 모듈 범위로 제한한다.

const assignee = alias(householdMember, 'assignee');

const taskFields = {
  id: task.id,
  title: task.title,
  note: task.note,
  recurrence: task.recurrence,
  startDate: task.startDate,
  nextDueDate: task.nextDueDate,
  lastCompletedAt: task.lastCompletedAt,
  estimatedMinutes: task.estimatedMinutes,
  createdByMemberId: task.createdByMemberId,
  spaceId: task.spaceId,
  spaceName: space.name,
  spaceIcon: space.icon,
  assigneeMemberId: task.assigneeMemberId,
  assigneeName: assignee.displayName,
  assigneeColor: assignee.color,
};

export type TaskListItem = {
  id: string;
  title: string;
  note: string | null;
  recurrence: (typeof task.$inferSelect)['recurrence'];
  startDate: string;
  nextDueDate: string | null;
  lastCompletedAt: Date | null;
  estimatedMinutes: number | null;
  createdByMemberId: string;
  spaceId: string | null;
  spaceName: string | null;
  spaceIcon: string | null;
  assigneeMemberId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
};

function selectTasks(ctx: MemberContext, module: TaskModule, ...conditions: (SQL | undefined)[]) {
  return db
    .select(taskFields)
    .from(task)
    .leftJoin(space, eq(task.spaceId, space.id))
    .leftJoin(assignee, eq(task.assigneeMemberId, assignee.id))
    .where(
      and(
        eq(task.householdId, ctx.householdId),
        eq(task.module, module),
        isNull(task.archivedAt),
        ...conditions,
      ),
    );
}

/** 보관하지 않은 할 일 전체 (완료한 1회성 포함). 가구 하나라 많지 않으므로 묶기는 화면 쪽에서 한다. */
export async function listTasks(
  ctx: MemberContext,
  module: TaskModule,
  filter: { spaceId?: string | null } = {},
): Promise<TaskListItem[]> {
  const bySpace =
    filter.spaceId === undefined
      ? undefined
      : filter.spaceId === null
        ? isNull(task.spaceId)
        : eq(task.spaceId, filter.spaceId);
  return selectTasks(ctx, module, bySpace).orderBy(task.nextDueDate, task.createdAt);
}

export async function getTask(
  ctx: MemberContext,
  module: TaskModule,
  taskId: string,
): Promise<TaskListItem | null> {
  const [row] = await selectTasks(ctx, module, eq(task.id, taskId)).limit(1);
  return row ?? null;
}

export type CompletionListItem = {
  id: string;
  completedAt: Date;
  /** 기록한 시각. 완료 취소는 가장 늦게 기록한 1건만 할 수 있다 */
  createdAt: Date;
  dueDate: string | null;
  note: string | null;
  completedByName: string;
  completedByColor: string;
};

/** 완료 기록 (완료 시각 최근 순) */
export async function listCompletions(
  ctx: MemberContext,
  taskId: string,
  limit = 30,
): Promise<CompletionListItem[]> {
  return db
    .select({
      id: taskCompletion.id,
      completedAt: taskCompletion.completedAt,
      createdAt: taskCompletion.createdAt,
      dueDate: taskCompletion.dueDate,
      note: taskCompletion.note,
      completedByName: householdMember.displayName,
      completedByColor: householdMember.color,
    })
    .from(taskCompletion)
    .innerJoin(householdMember, eq(taskCompletion.completedByMemberId, householdMember.id))
    .where(and(eq(taskCompletion.householdId, ctx.householdId), eq(taskCompletion.taskId, taskId)))
    .orderBy(desc(taskCompletion.completedAt), desc(taskCompletion.id))
    .limit(limit);
}
