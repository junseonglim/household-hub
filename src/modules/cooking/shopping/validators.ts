import { z } from 'zod';
import { localDateSchema } from '@/modules/core/task/validators';
import { SHOPPING_CATEGORIES } from './category';
import { parseItemLine, parseQuantity } from './parse';

const itemIdSchema = z.uuid({ error: '잘못된 요청이에요.' });

/** 빠른 추가: '양파 2개' 한 줄 */
export const quickAddSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, '살 것을 입력해 주세요.')
    .max(60, '60자까지 쓸 수 있어요.')
    .transform((text) => parseItemLine(text)!),
});

export const toggleItemSchema = z.object({
  itemId: itemIdSchema,
  checked: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

/** 항목 고치기 (이름 · 수량 · 단위 · 카테고리 · 메모) */
export const updateItemSchema = z.object({
  itemId: itemIdSchema,
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(30, '이름은 30자까지 쓸 수 있어요.'),
  quantity: z
    .string()
    .optional()
    .transform((value, ctx) => {
      const quantity = parseQuantity(value ?? '');
      if (quantity === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: '숫자로 입력하거나 비워 두세요 (예: 2, 0.5, 1/2).',
        });
        return z.NEVER;
      }
      return quantity;
    }),
  unit: z
    .string()
    .trim()
    .max(10, '단위는 10자까지 쓸 수 있어요.')
    .optional()
    .transform((value) => value || null),
  category: z.enum(SHOPPING_CATEGORIES, { error: '카테고리를 골라 주세요.' }),
  note: z
    .string()
    .trim()
    .max(100, '메모는 100자까지 쓸 수 있어요.')
    .optional()
    .transform((value) => value || null),
});

export type UpdateItemInput = z.output<typeof updateItemSchema>;

export const itemTargetSchema = z.object({ itemId: itemIdSchema });

/** 식단에서 가져오기: 기간 + 고른 재료(미리보기의 key) */
export const importRangeSchema = z
  .object({ from: localDateSchema, to: localDateSchema })
  .refine((range) => range.from <= range.to, {
    path: ['to'],
    error: '끝 날짜가 시작 날짜보다 빨라요.',
  });
