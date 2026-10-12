import { z } from 'zod';
import { isValidLocalDate } from '@/lib/local-date';
import type { Recurrence, Weekday } from './recurrence';

// 할 일 엔진 입력 규칙. 화면 폼 해석(모듈의 validators.ts)이 이 스키마로 마지막 검증을 한다.

export const localDateSchema = z
  .string()
  .refine(isValidLocalDate, { error: '날짜를 확인해 주세요.' });

const weekdaySchema = z
  .number()
  .int()
  .min(0)
  .max(6)
  .transform((day) => day as Weekday);

export const recurrenceSchema: z.ZodType<Recurrence> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('once'), dueDate: localDateSchema.nullable() }),
  z.object({ type: z.literal('daily') }),
  z.object({
    type: z.literal('weekly'),
    weekdays: z.array(weekdaySchema).min(1, '요일을 하나 이상 골라 주세요.'),
  }),
  z.object({
    type: z.literal('monthly'),
    day: z.number().int().min(1, '날짜를 골라 주세요.').max(31, '날짜를 골라 주세요.'),
  }),
  z.object({
    type: z.literal('every_n_days'),
    days: z
      .number({ error: '며칠마다 할지 숫자로 입력해 주세요.' })
      .int('며칠마다 할지 숫자로 입력해 주세요.')
      .min(1, '1일 이상으로 입력해 주세요.')
      .max(365, '365일까지 입력할 수 있어요.'),
  }),
]);

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, '할 일 이름을 입력해 주세요.')
  .max(40, '할 일 이름은 40자까지 쓸 수 있어요.');

export const taskNoteSchema = z.string().trim().max(200, '메모는 200자까지 쓸 수 있어요.');
