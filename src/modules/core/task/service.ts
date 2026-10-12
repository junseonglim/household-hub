import { and, desc, eq, max } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { householdMember, space, task, taskCompletion } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { localDateOf, maxDate, todayIn, type LocalDate } from '@/lib/local-date';
import { logActivity, type ActivityEntry } from '../activity/log';
import type { MemberContext } from '../member-context';
import { canArchiveTask } from './permissions';
import {
  firstDueDate,
  nextDueDate,
  normalizeRecurrence,
  scheduleAfterEdit,
  type Recurrence,
} from './recurrence';

// 할 일 엔진 업무 규칙 (docs/03-architecture.md 6.1절, docs/modules/cleaning.md 5절).
// 모듈(청소 등)은 자기 module 값을 넘겨서 쓴다. 다른 모듈의 할 일은 '없음'으로 처리한다.

export type TaskModule = Exclude<ActivityEntry['module'], 'core'>;

export type TaskInput = {
  title: string;
  spaceId: string | null;
  recurrence: Recurrence;
  /** 1회성은 쓰지 않는다 (기한은 recurrence.dueDate) */
  startDate: LocalDate;
  /** null = 누구나 */
  assigneeMemberId: string | null;
  estimatedMinutes: number | null;
  note: string | null;
};

export type CompletionInput = {
  taskId: string;
  /** 화면에 보였던 예정일. 그사이 다른 가족이 완료했으면 CONFLICT */
  expectedDueDate: LocalDate | null;
  /** 기본: 나 */
  completedByMemberId?: string;
  /** 기본: 지금. 과거로만 바꿀 수 있다 */
  completedAt?: Date;
  note?: string | null;
};

const notFound = () => new DomainError('NOT_FOUND', '할 일을 찾을 수 없어요.');

/** 이 가구의 보관하지 않은 공간인지 확인한다 */
async function findSpace(tx: Tx, ctx: MemberContext, spaceId: string | null) {
  if (!spaceId) return null;
  const [row] = await tx
    .select({ id: space.id, name: space.name, archivedAt: space.archivedAt })
    .from(space)
    .where(and(eq(space.id, spaceId), eq(space.householdId, ctx.householdId)))
    .limit(1);
  if (!row || row.archivedAt) throw new DomainError('INVALID', '공간을 다시 골라 주세요.');
  return row;
}

/** 이 가구의 활성 구성원인지 확인한다 (담당자 · 완료한 사람) */
async function findActiveMember(tx: Tx, ctx: MemberContext, memberId: string) {
  const [row] = await tx
    .select({ id: householdMember.id, displayName: householdMember.displayName })
    .from(householdMember)
    .where(
      and(
        eq(householdMember.id, memberId),
        eq(householdMember.householdId, ctx.householdId),
        eq(householdMember.status, 'active'),
      ),
    )
    .limit(1);
  if (!row) throw new DomainError('INVALID', '구성원을 다시 골라 주세요.');
  return row;
}

/** 할 일을 잠그고 읽는다 (동시에 두 사람이 완료해도 순서대로 처리되도록) */
async function lockTask(
  tx: Tx,
  ctx: MemberContext,
  module: TaskModule,
  taskId: string,
  { allowArchived = false } = {},
) {
  const [row] = await tx
    .select()
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.householdId, ctx.householdId), eq(task.module, module)))
    .limit(1)
    .for('update');
  if (!row || (row.archivedAt && !allowArchived)) throw notFound();
  return row;
}

async function prepareNewTask(tx: Tx, ctx: MemberContext, module: TaskModule, input: TaskInput) {
  const foundSpace = await findSpace(tx, ctx, input.spaceId);
  if (input.assigneeMemberId) await findActiveMember(tx, ctx, input.assigneeMemberId);
  const recurrence = normalizeRecurrence(input.recurrence);
  const startDate = recurrence.type === 'once' ? todayIn(ctx.timezone) : input.startDate;
  return {
    values: {
      householdId: ctx.householdId,
      module,
      spaceId: foundSpace?.id ?? null,
      title: input.title,
      note: input.note,
      recurrence,
      startDate,
      nextDueDate: firstDueDate(recurrence, startDate),
      assigneeMemberId: input.assigneeMemberId,
      estimatedMinutes: input.estimatedMinutes,
      createdByMemberId: ctx.memberId,
    },
    spaceName: foundSpace?.name ?? null,
  };
}

export async function createTask(
  ctx: MemberContext,
  module: TaskModule,
  input: TaskInput,
): Promise<string> {
  return db.transaction(async (tx) => {
    const { values, spaceName } = await prepareNewTask(tx, ctx, module, input);
    const [created] = await tx.insert(task).values(values).returning({ id: task.id });
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module,
      action: 'task.created',
      target: { type: 'task', id: created!.id },
      payload: { title: input.title, spaceName },
    });
    return created!.id;
  });
}

/** 여러 개를 한 번에 등록한다 (처음 설정 템플릿). 활동 로그는 1건만 남긴다. */
export async function createTasks(
  ctx: MemberContext,
  module: TaskModule,
  inputs: TaskInput[],
): Promise<number> {
  if (inputs.length === 0) throw new DomainError('INVALID', '등록할 할 일을 골라 주세요.');
  return db.transaction(async (tx) => {
    const rows = [];
    for (const input of inputs) rows.push((await prepareNewTask(tx, ctx, module, input)).values);
    await tx.insert(task).values(rows);
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module,
      action: 'task.created',
      payload: { count: rows.length },
    });
    return rows.length;
  });
}

/** 할 일 수정. 예정일을 다시 계산하는 규칙은 scheduleAfterEdit (수정 화면 미리보기와 같다) */
export async function updateTask(
  ctx: MemberContext,
  module: TaskModule,
  taskId: string,
  input: TaskInput,
) {
  await db.transaction(async (tx) => {
    const current = await lockTask(tx, ctx, module, taskId);
    const foundSpace = await findSpace(tx, ctx, input.spaceId);
    if (input.assigneeMemberId && input.assigneeMemberId !== current.assigneeMemberId) {
      await findActiveMember(tx, ctx, input.assigneeMemberId);
    }

    const recurrence = normalizeRecurrence(input.recurrence);
    const schedule = scheduleAfterEdit(
      current,
      { recurrence, startDate: input.startDate },
      {
        today: todayIn(ctx.timezone),
        lastCompletedOn: current.lastCompletedAt
          ? localDateOf(current.lastCompletedAt, ctx.timezone)
          : null,
      },
    );

    await tx
      .update(task)
      .set({
        title: input.title,
        spaceId: foundSpace?.id ?? null,
        recurrence,
        ...schedule,
        assigneeMemberId: input.assigneeMemberId,
        estimatedMinutes: input.estimatedMinutes,
        note: input.note,
      })
      .where(eq(task.id, current.id));
  });
}

/** 보관: 목록에서 사라지지만 완료 기록은 남는다 */
export async function archiveTask(ctx: MemberContext, module: TaskModule, taskId: string) {
  await db.transaction(async (tx) => {
    const current = await lockTask(tx, ctx, module, taskId);
    if (!canArchiveTask({ id: ctx.memberId, role: ctx.role }, current)) {
      throw new DomainError('FORBIDDEN', '내가 만든 할 일만 보관할 수 있어요.');
    }
    await tx.update(task).set({ archivedAt: new Date() }).where(eq(task.id, current.id));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module,
      action: 'task.archived',
      target: { type: 'task', id: current.id },
      payload: { title: current.title },
    });
  });
}

/** 미래 시각 판정 여유 (기기 시계가 조금 빠른 경우) */
const CLOCK_SKEW_MS = 60_000;

export async function completeTask(
  ctx: MemberContext,
  module: TaskModule,
  input: CompletionInput,
): Promise<{ completionId: string; title: string; nextDueDate: LocalDate | null }> {
  const now = new Date();
  const completedAt = input.completedAt ?? now;
  if (completedAt.getTime() > now.getTime() + CLOCK_SKEW_MS) {
    throw new DomainError('INVALID', '아직 오지 않은 시각으로는 기록할 수 없어요.');
  }

  return db.transaction(async (tx) => {
    const current = await lockTask(tx, ctx, module, input.taskId);
    if (current.recurrence.type === 'once' && current.lastCompletedAt && !current.nextDueDate) {
      throw new DomainError('CONFLICT', '이미 완료한 할 일이에요.');
    }
    if (current.nextDueDate !== input.expectedDueDate) {
      throw new DomainError('CONFLICT', '다른 가족이 먼저 완료했어요. 목록을 새로 고쳤어요.');
    }
    const completer = await findActiveMember(tx, ctx, input.completedByMemberId ?? ctx.memberId);

    // 예전 날짜로 기록하더라도 다음 예정일이 뒤로 돌아가지는 않게, 마지막 완료일보다 앞서지 않게 계산한다
    const completedOn = localDateOf(completedAt, ctx.timezone);
    const lastCompletedOn = current.lastCompletedAt
      ? localDateOf(current.lastCompletedAt, ctx.timezone)
      : null;
    const due = nextDueDate(
      current.recurrence,
      current.nextDueDate,
      lastCompletedOn ? maxDate(completedOn, lastCompletedOn) : completedOn,
    );
    const lastCompletedAt =
      current.lastCompletedAt && current.lastCompletedAt > completedAt
        ? current.lastCompletedAt
        : completedAt;

    const [completion] = await tx
      .insert(taskCompletion)
      .values({
        householdId: ctx.householdId,
        taskId: current.id,
        completedByMemberId: completer.id,
        completedAt,
        dueDate: current.nextDueDate,
        note: input.note || null,
      })
      .returning({ id: taskCompletion.id });
    await tx.update(task).set({ nextDueDate: due, lastCompletedAt }).where(eq(task.id, current.id));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module,
      action: 'task.completed',
      target: { type: 'task', id: current.id },
      payload: {
        title: current.title,
        completedByName: completer.displayName,
        dueDate: current.nextDueDate,
        completedOn,
      },
    });
    return { completionId: completion!.id, title: current.title, nextDueDate: due };
  });
}

/**
 * 완료 취소: 그 할 일의 가장 최근 완료 기록 1건만 취소할 수 있다.
 * 다음 예정일은 완료 당시 예정일로, 마지막 완료 시각은 남은 기록 중 가장 늦은 시각으로 되돌린다.
 */
export async function undoCompletion(
  ctx: MemberContext,
  module: TaskModule,
  completionId: string,
): Promise<{ title: string }> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: taskCompletion.id,
        taskId: taskCompletion.taskId,
        dueDate: taskCompletion.dueDate,
      })
      .from(taskCompletion)
      .where(
        and(eq(taskCompletion.id, completionId), eq(taskCompletion.householdId, ctx.householdId)),
      )
      .limit(1);
    if (!target) throw new DomainError('NOT_FOUND', '이미 취소한 완료 기록이에요.');

    const current = await lockTask(tx, ctx, module, target.taskId, { allowArchived: true });
    const [latest] = await tx
      .select({ id: taskCompletion.id })
      .from(taskCompletion)
      .where(eq(taskCompletion.taskId, current.id))
      .orderBy(desc(taskCompletion.createdAt), desc(taskCompletion.id))
      .limit(1);
    if (latest?.id !== target.id) {
      throw new DomainError('CONFLICT', '가장 최근 완료 기록만 취소할 수 있어요.');
    }

    await tx.delete(taskCompletion).where(eq(taskCompletion.id, target.id));
    const [remaining] = await tx
      .select({ lastCompletedAt: max(taskCompletion.completedAt) })
      .from(taskCompletion)
      .where(eq(taskCompletion.taskId, current.id));
    await tx
      .update(task)
      .set({ nextDueDate: target.dueDate, lastCompletedAt: remaining?.lastCompletedAt ?? null })
      .where(eq(task.id, current.id));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module,
      action: 'task.completion_undone',
      target: { type: 'task', id: current.id },
      payload: { title: current.title },
    });
    return { title: current.title };
  });
}
