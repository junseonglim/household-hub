import { z } from 'zod';
import { PREP_CATEGORIES } from '../constants';

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

/** 준비물 추가 · 고치기 */
export const prepItemSchema = z.object({
  category: z.enum(PREP_CATEGORIES, { error: '카테고리를 골라 주세요.' }),
  title: z.string().trim().min(1, '무엇을 준비할지 써 주세요.').max(40, '40자까지 쓸 수 있어요.'),
  quantity: optionalText(20, '수량은 20자까지 쓸 수 있어요.'),
  note: optionalText(100, '메모는 100자까지 쓸 수 있어요.'),
});
export type PrepItemInput = z.output<typeof prepItemSchema>;

export const prepTargetSchema = z.object({ itemId: z.uuid({ error: '잘못된 요청이에요.' }) });

export const updatePrepItemSchema = prepItemSchema.extend(prepTargetSchema.shape);
export type UpdatePrepItemInput = z.output<typeof updatePrepItemSchema>;

export const togglePrepItemSchema = prepTargetSchema.extend({
  done: z.enum(['true', 'false']).transform((value) => value === 'true'),
});
