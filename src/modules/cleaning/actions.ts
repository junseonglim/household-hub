'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { failure, formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { instantFromLocalDateTime, todayIn } from '@/lib/local-date';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import { describeDue } from '@/modules/core/task/recurrence';
import {
  archiveTask,
  completeTask,
  createTask,
  createTasks,
  undoCompletion,
  updateTask,
} from '@/modules/core/task/service';
import {
  completeTaskSchema,
  completionTargetSchema,
  setupTasksFromForm,
  taskFormSchema,
  taskTargetSchema,
} from './validators';

const MODULE = 'cleaning';

// 청소 화면 전체(할 일 · 공간별 · 상세)를 새로 그린다
const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/cleaning', 'layout'));

/** 오류 시 되살릴 할 일 폼 값 */
const TASK_FORM_FIELDS = [
  'title',
  'spaceId',
  'startDate',
  'assigneeMemberId',
  'estimatedMinutes',
  'note',
  'recurrenceType',
  'weekdays',
  'monthDay',
  'everyDays',
  'dueDate',
];

export async function createTaskAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = taskFormSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, TASK_FORM_FIELDS));
    await createTask(ctx, MODULE, parsed.data);
    redirect('/cleaning');
  });
}

export async function updateTaskAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const target = taskTargetSchema.safeParse(values);
    if (!target.success) return invalidInput(target.error);
    const parsed = taskFormSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, TASK_FORM_FIELDS));
    await updateTask(ctx, MODULE, target.data.taskId, parsed.data);
    redirect(`/cleaning/tasks/${target.data.taskId}` as Route);
  });
}

export async function archiveTaskAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = taskTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await archiveTask(ctx, MODULE, parsed.data.taskId);
    redirect('/cleaning');
  });
}

export type CompletedTask = { completionId: string };

/** 완료 기록. 목록의 빠른 완료는 taskId · expectedDueDate만, '자세히 기록'은 사람 · 시각 · 메모도 보낸다 */
export async function completeTaskAction(
  _prev: FormState<CompletedTask>,
  formData: FormData,
): Promise<FormState<CompletedTask>> {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = completeTaskSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['completedAt', 'note']));

    const { completedAt } = parsed.data;
    const result = await completeTask(ctx, MODULE, {
      taskId: parsed.data.taskId,
      expectedDueDate: parsed.data.expectedDueDate,
      completedByMemberId: parsed.data.completedByMemberId ?? undefined,
      // 형식은 검증을 통과했으므로 가구 시간대로 바꾸기만 한다
      completedAt: completedAt
        ? (instantFromLocalDateTime(completedAt, ctx.timezone) ?? undefined)
        : undefined,
      note: parsed.data.note,
    });
    // '완료! 다음: 내일', '완료! 다음: 10/17 (토)'
    const next = result.nextDueDate && describeDue(result.nextDueDate, todayIn(ctx.timezone));
    return success(next ? `완료! 다음: ${next}` : `'${result.title}' 완료!`, {
      completionId: result.completionId,
    });
  });
}

export async function undoCompletionAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = completionTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    const { title } = await undoCompletion(ctx, MODULE, parsed.data.completionId);
    return success(`'${title}' 완료를 취소했어요.`);
  });
}

export async function setupTasksAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const result = setupTasksFromForm(values, todayIn(ctx.timezone));
    if ('fieldErrors' in result) {
      return failure('반복 규칙을 확인해 주세요.', { fieldErrors: result.fieldErrors });
    }
    await createTasks(ctx, MODULE, result.tasks);
    redirect('/cleaning');
  });
}
