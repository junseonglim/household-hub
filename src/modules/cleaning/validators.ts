import { z } from 'zod';
import { instantFromLocalDateTime, isValidLocalDate } from '@/lib/local-date';
import { RECURRENCE_TYPES, type Recurrence, type Weekday } from '@/modules/core/task/recurrence';
import type { TaskInput } from '@/modules/core/task/service';
import {
  localDateSchema,
  recurrenceSchema,
  taskNoteSchema,
  taskTitleSchema,
} from '@/modules/core/task/validators';
import { RECURRENCE_FIELDS, setupFieldPrefix } from './form-fields';
import { CLEANING_TEMPLATES } from './templates';

// 청소 화면 폼 해석. 폼 값은 모두 문자열이라 여기서 할 일 엔진 입력(TaskInput)으로 바꾼다.

type FieldError = { field: string; message: string };

const toInt = (value: string | undefined) =>
  value !== undefined && /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;

/** 폼 값에서 반복 규칙을 만든다. 틀린 칸이 있으면 그 칸 이름과 문구를 돌려준다. */
export function recurrenceFromForm(
  values: Record<string, string>,
  prefix = '',
): { recurrence: Recurrence } | { error: FieldError } {
  const get = (field: string) => values[prefix + field];
  const type = get(RECURRENCE_FIELDS.type);
  const fail = (field: string, message: string) => ({ error: { field: prefix + field, message } });

  let candidate: unknown;
  switch (type) {
    case 'once': {
      const dueDate = get(RECURRENCE_FIELDS.dueDate)?.trim() || null;
      if (dueDate && !isValidLocalDate(dueDate)) {
        return fail(RECURRENCE_FIELDS.dueDate, '날짜를 확인해 주세요.');
      }
      candidate = { type, dueDate };
      break;
    }
    case 'daily':
      candidate = { type };
      break;
    case 'weekly': {
      const weekdays = (get(RECURRENCE_FIELDS.weekdays) ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number) as Weekday[];
      candidate = { type, weekdays };
      break;
    }
    case 'monthly':
      candidate = { type, day: toInt(get(RECURRENCE_FIELDS.monthDay)) };
      break;
    case 'every_n_days':
      candidate = { type, days: toInt(get(RECURRENCE_FIELDS.everyDays)) };
      break;
    default:
      return fail(RECURRENCE_FIELDS.type, '반복을 골라 주세요.');
  }

  const parsed = recurrenceSchema.safeParse(candidate);
  if (parsed.success) return { recurrence: parsed.data };
  const fieldByType: Record<(typeof RECURRENCE_TYPES)[number], string> = {
    once: RECURRENCE_FIELDS.dueDate,
    daily: RECURRENCE_FIELDS.type,
    weekly: RECURRENCE_FIELDS.weekdays,
    monthly: RECURRENCE_FIELDS.monthDay,
    every_n_days: RECURRENCE_FIELDS.everyDays,
  };
  return fail(fieldByType[type], parsed.error.issues[0]?.message ?? '반복을 확인해 주세요.');
}

const optionalId = z
  .string()
  .optional()
  .transform((value) => value || null)
  .pipe(z.uuid({ error: '다시 골라 주세요.' }).nullable());

const optionalText = (schema: z.ZodString) => schema.optional().transform((value) => value || null);

/** 할 일 등록 · 수정 폼 */
export const taskFormSchema = z
  .object({
    title: taskTitleSchema,
    spaceId: optionalId,
    startDate: localDateSchema,
    assigneeMemberId: optionalId,
    estimatedMinutes: z
      .string()
      .optional()
      .transform((value) => (value?.trim() ? Number(value.trim()) : null))
      .pipe(
        z
          .number({ error: '숫자로 입력해 주세요.' })
          .int('분 단위 숫자로 입력해 주세요.')
          .min(1, '1분 이상으로 입력해 주세요.')
          .max(600, '600분(10시간)까지 입력할 수 있어요.')
          .nullable(),
      ),
    note: optionalText(taskNoteSchema),
  })
  .loose()
  .transform((data, ctx): TaskInput => {
    const result = recurrenceFromForm(data as Record<string, string>);
    if ('error' in result) {
      ctx.addIssue({ code: 'custom', path: [result.error.field], message: result.error.message });
      return z.NEVER;
    }
    return {
      title: data.title,
      spaceId: data.spaceId,
      recurrence: result.recurrence,
      startDate: data.startDate,
      assigneeMemberId: data.assigneeMemberId,
      estimatedMinutes: data.estimatedMinutes,
      note: data.note,
    };
  });

export const taskTargetSchema = z.object({ taskId: z.uuid({ error: '잘못된 요청이에요.' }) });

/** 완료 기록. 빠른 완료는 taskId · expectedDueDate만 보낸다. */
export const completeTaskSchema = z.object({
  taskId: z.uuid({ error: '잘못된 요청이에요.' }),
  expectedDueDate: z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(localDateSchema.nullable()),
  completedByMemberId: optionalId,
  /** datetime-local 값 ('YYYY-MM-DDTHH:mm'). 비우면 지금. 시간대 변환은 서비스 직전에 한다 */
  completedAt: z
    .string()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || instantFromLocalDateTime(value, 'UTC') !== null, {
      error: '완료 시각을 확인해 주세요.',
    }),
  note: optionalText(taskNoteSchema),
});

export const completionTargetSchema = z.object({
  completionId: z.uuid({ error: '잘못된 요청이에요.' }),
});

export function setupTasksFromForm(
  values: Record<string, string>,
  startDate: string,
): { tasks: TaskInput[] } | { fieldErrors: Record<string, string> } {
  const tasks: TaskInput[] = [];
  const fieldErrors: Record<string, string> = {};
  CLEANING_TEMPLATES.forEach((template, index) => {
    const prefix = setupFieldPrefix(index);
    if (values[`${prefix}selected`] !== 'on') return;
    const result = recurrenceFromForm(values, prefix);
    if ('error' in result) {
      fieldErrors[result.error.field] = result.error.message;
      return;
    }
    const spaceId = optionalId.safeParse(values[`${prefix}spaceId`]);
    tasks.push({
      title: template.title,
      spaceId: spaceId.success ? spaceId.data : null,
      recurrence: result.recurrence,
      startDate,
      assigneeMemberId: null,
      estimatedMinutes: null,
      note: null,
    });
  });
  return Object.keys(fieldErrors).length > 0 ? { fieldErrors } : { tasks };
}
