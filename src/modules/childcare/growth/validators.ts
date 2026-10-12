import { z } from 'zod';
import type { LocalDate } from '@/lib/local-date';
import { localDateSchema } from '@/modules/core/task/validators';
import { optionalDecimal } from '../child/validators';

const idSchema = z.uuid({ error: '잘못된 요청이에요.' });

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

const pastDate = (today: LocalDate) =>
  z
    .string()
    .min(1, '날짜를 넣어 주세요.')
    .pipe(localDateSchema)
    .refine((date) => date <= today, { error: '오늘이나 그 전 날짜로 넣어 주세요.' });

/** 측정: 몸무게 · 키 · 머리둘레 중 하나 이상 */
const measurementFields = (today: LocalDate) => ({
  measuredOn: pastDate(today),
  weightKg: optionalDecimal(0.3, 50, 2, '몸무게를 kg으로 써 주세요. (예: 5.1)'),
  heightCm: optionalDecimal(20, 150, 1, '키를 cm로 써 주세요. (예: 58.2)'),
  headCm: optionalDecimal(20, 70, 1, '머리둘레를 cm로 써 주세요. (예: 39.1)'),
  note: optionalText(100, '메모는 100자까지 쓸 수 있어요.'),
});

const atLeastOne = (input: {
  weightKg: number | null;
  heightCm: number | null;
  headCm: number | null;
}) => input.weightKg !== null || input.heightCm !== null || input.headCm !== null;
const AT_LEAST_ONE = {
  path: ['weightKg'],
  error: '몸무게 · 키 · 머리둘레 중 하나 이상 써 주세요.',
};

export const addMeasurementSchema = (today: LocalDate) =>
  z.object({ childId: idSchema, ...measurementFields(today) }).refine(atLeastOne, AT_LEAST_ONE);
export const updateMeasurementSchema = (today: LocalDate) =>
  z.object({ recordId: idSchema, ...measurementFields(today) }).refine(atLeastOne, AT_LEAST_ONE);
export type MeasurementInput = Omit<z.output<ReturnType<typeof addMeasurementSchema>>, 'childId'>;

/** 발달 기록: 이름 · 날짜 · 메모 */
const milestoneFields = (today: LocalDate) => ({
  title: z.string().trim().min(1, '무엇을 했는지 써 주세요.').max(30, '30자까지 쓸 수 있어요.'),
  achievedOn: pastDate(today),
  note: optionalText(200, '메모는 200자까지 쓸 수 있어요.'),
});

export const addMilestoneSchema = (today: LocalDate) =>
  z.object({ childId: idSchema, ...milestoneFields(today) });
export const updateMilestoneSchema = (today: LocalDate) =>
  z.object({ milestoneId: idSchema, ...milestoneFields(today) });
export type MilestoneInput = Omit<z.output<ReturnType<typeof addMilestoneSchema>>, 'childId'>;

export const measurementTargetSchema = z.object({ recordId: idSchema });
export const milestoneTargetSchema = z.object({ milestoneId: idSchema });
