import { z } from 'zod';
import type { LocalDate } from '@/lib/local-date';
import { localDateSchema } from '@/modules/core/task/validators';
import { CUSTOM_EVENT_KINDS } from '../constants';

const idSchema = z.uuid({ error: '잘못된 요청이에요.' });

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

const placeSchema = optionalText(40, '장소는 40자까지 쓸 수 있어요.');
const noteSchema = optionalText(500, '메모는 500자까지 쓸 수 있어요.');

const timeSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: '시각을 확인해 주세요.' })
      .nullable(),
  );

const eventFields = {
  kind: z.enum(CUSTOM_EVENT_KINDS, { error: '종류를 골라 주세요.' }),
  title: z
    .string()
    .trim()
    .min(1, '일정 이름을 써 주세요.')
    .max(40, '일정 이름은 40자까지 쓸 수 있어요.'),
  date: z.string().min(1, '날짜를 넣어 주세요.').pipe(localDateSchema),
  time: timeSchema,
  place: placeSchema,
  note: noteSchema,
};

/** [+ 일정]: 산부인과 · 병원 방문 · 접종 · 그 밖의 일정 */
export const addEventSchema = z.object({ childId: idSchema, ...eventFields });
export type AddEventInput = z.output<typeof addEventSchema>;

/** 직접 추가한 일정 고치기 */
export const updateEventSchema = z.object({ eventId: idSchema, ...eventFields });
export type UpdateEventInput = z.output<typeof updateEventSchema>;
export type EventFields = Omit<AddEventInput, 'childId'>;

export const eventTargetSchema = z.object({ eventId: idSchema });

const eventIdsSchema = z.array(idSchema).min(1, '일정을 골라 주세요.').max(20);
export const eventTargetsSchema = z.object({ eventIds: eventIdsSchema });

const doneOnSchema = (today: LocalDate) =>
  localDateSchema.refine((date) => date <= today, { error: '오늘이나 그 전 날짜로 넣어 주세요.' });

/** [했어요]: 한 날 · 장소 · 메모. 같은 날 맞힌 접종은 여러 개를 한 번에 */
export const completeEventsSchema = (today: LocalDate) =>
  z.object({
    eventIds: eventIdsSchema,
    doneOn: doneOnSchema(today),
    place: placeSchema,
    note: noteSchema,
  });
export type CompleteEventsInput = z.output<ReturnType<typeof completeEventsSchema>>;

/** 이미 한 일정의 기록 고치기 */
export const editDoneSchema = (today: LocalDate) =>
  z.object({
    eventId: idSchema,
    doneOn: doneOnSchema(today),
    place: placeSchema,
    note: noteSchema,
  });
export type EditDoneInput = z.output<ReturnType<typeof editDoneSchema>>;
