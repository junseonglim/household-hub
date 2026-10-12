import { z } from 'zod';
import { parseItemLine, type ParsedItem } from '../shopping/parse';

// 레시피 등록 · 수정 폼 (docs/modules/cooking.md 4.2절).
// 재료와 조리 순서는 한 줄에 하나씩 쓰는 글상자로 받는다 (블로그에서 붙여 넣기 쉽게).

const optionalInt = (label: string, max: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? Number(value.trim()) : null))
    .pipe(
      z
        .number({ error: `${label}은 숫자로 입력해 주세요.` })
        .int(`${label}은 숫자로 입력해 주세요.`)
        .min(1, `${label}은 1 이상으로 입력해 주세요.`)
        .max(max, `${label}은 ${max}까지 입력할 수 있어요.`)
        .nullable(),
    );

const lines = (value: string | undefined) =>
  (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const recipeFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '요리 이름을 입력해 주세요.')
    .max(40, '요리 이름은 40자까지 쓸 수 있어요.'),
  description: z
    .string()
    .trim()
    .max(200, '한 줄 설명은 200자까지 쓸 수 있어요.')
    .optional()
    .transform((value) => value || null),
  servings: optionalInt('인분', 20),
  cookMinutes: optionalInt('조리 시간', 600),
  /** 고른 태그 + 직접 쓴 태그(쉼표로 구분) */
  tags: z
    .array(z.string())
    .transform((tags) => [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))])
    .pipe(
      z
        .array(z.string().max(10, '태그는 10자까지 쓸 수 있어요.'))
        .max(10, '태그는 10개까지 붙일 수 있어요.'),
    ),
  ingredients: z
    .string()
    .optional()
    .transform((value) => lines(value).map((line) => parseItemLine(line)!))
    .pipe(
      z
        .array(
          z.custom<ParsedItem>(
            (item) => (item as ParsedItem).name.length <= 30,
            '재료 이름은 30자까지 쓸 수 있어요.',
          ),
        )
        .max(50, '재료는 50개까지 쓸 수 있어요.'),
    ),
  steps: z
    .string()
    .optional()
    .transform(lines)
    .pipe(
      z
        .array(z.string().max(300, '한 단계는 300자까지 쓸 수 있어요.'))
        .max(30, '조리 순서는 30단계까지 쓸 수 있어요.'),
    ),
  sourceUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(
      z
        .url({
          protocol: /^https?$/,
          error: 'http:// 또는 https://로 시작하는 주소를 넣어 주세요.',
        })
        .max(500)
        .nullable(),
    ),
});

export type RecipeInput = z.output<typeof recipeFormSchema>;

/** FormData → 스키마 입력. 태그는 같은 이름의 칸이 여러 개라 따로 모은다 */
export function recipeFormInput(formData: FormData, values: Record<string, string>) {
  const custom = (values.customTags ?? '').split(',');
  const picked = formData.getAll('tags').filter((value) => typeof value === 'string');
  return { ...values, tags: [...picked, ...custom] };
}

export const recipeTargetSchema = z.object({ recipeId: z.uuid({ error: '잘못된 요청이에요.' }) });
