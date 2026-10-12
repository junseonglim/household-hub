import { z } from 'zod';
import { localDateSchema } from '@/modules/core/task/validators';
import { MEAL_KINDS, MEAL_TYPES } from '../constants';

const optionalId = z
  .string()
  .optional()
  .transform((value) => value || null)
  .pipe(z.uuid({ error: '다시 골라 주세요.' }).nullable());

/** 식단에 메뉴 하나 추가. 레시피를 고르면 이름을 비워 둬도 된다 */
export const addEntrySchema = z
  .object({
    date: localDateSchema,
    mealType: z.enum(MEAL_TYPES, { error: '끼니를 골라 주세요.' }),
    kind: z.enum(MEAL_KINDS, { error: '종류를 골라 주세요.' }),
    recipeId: optionalId,
    title: z.string().trim().max(40, '메뉴 이름은 40자까지 쓸 수 있어요.').optional(),
    cookMemberId: optionalId,
  })
  .refine((entry) => entry.kind !== 'home' || entry.recipeId || entry.title, {
    path: ['title'],
    error: '메뉴 이름을 쓰거나 레시피를 골라 주세요.',
  });

export type AddEntryInput = z.output<typeof addEntrySchema>;

export const entryTargetSchema = z.object({ entryId: z.uuid({ error: '잘못된 요청이에요.' }) });

export const weekTargetSchema = z.object({ weekStart: localDateSchema });
