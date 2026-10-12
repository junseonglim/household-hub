import { z } from 'zod';

const spaceIdSchema = z.uuid({ error: '잘못된 요청이에요.' });

const spaceFields = {
  name: z
    .string()
    .trim()
    .min(1, '공간 이름을 입력해 주세요.')
    .max(10, '공간 이름은 10자까지 쓸 수 있어요.'),
  /** 이모지 한두 개. 비우면 아이콘 없음 */
  icon: z
    .string()
    .trim()
    .max(16, '아이콘은 이모지 하나만 넣어 주세요.')
    .transform((value) => value || null),
};

export const createSpaceSchema = z.object(spaceFields);

export const updateSpaceSchema = z.object({ spaceId: spaceIdSchema, ...spaceFields });

export const moveSpaceSchema = z.object({
  spaceId: spaceIdSchema,
  direction: z.enum(['up', 'down'], { error: '잘못된 요청이에요.' }),
});

export const spaceTargetSchema = z.object({ spaceId: spaceIdSchema });
