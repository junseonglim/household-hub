import { z } from 'zod';
import { addDays, type LocalDate } from '@/lib/local-date';
import { localDateSchema } from '@/modules/core/task/validators';
import { SEXES } from '../constants';

// 아이 등록 · 태어났어요 · 수정 폼. '오늘'(가구 시간대)이 필요한 검사가 있어서 스키마를 만들어 쓴다.

/** 예정일은 오늘부터 300일 안 (연도를 잘못 넣는 실수를 막는다) */
const DUE_DATE_MAX_DAYS = 300;

const nameSchema = z
  .string()
  .trim()
  .min(1, '이름이나 태명을 써 주세요.')
  .max(20, '20자까지 쓸 수 있어요.');

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .pipe(localDateSchema.nullable());

const sexSchema = z
  .string()
  .optional()
  .transform((value) => value || null)
  .pipe(z.enum(SEXES, { error: '성별을 다시 골라 주세요.' }).nullable());

/** 빈칸이면 null, 숫자면 소수 digits자리로 반올림 (성장 기록도 쓴다) */
export const optionalDecimal = (min: number, max: number, digits: number, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .pipe(z.number({ error: message }).min(min, message).max(max, message).nullable())
    .transform((value) => (value === null ? null : Number(value.toFixed(digits))));

const birthWeight = optionalDecimal(0.3, 7, 2, '몸무게를 kg으로 써 주세요. (예: 3.25)');
const birthHeight = optionalDecimal(20, 70, 1, '키를 cm로 써 주세요. (예: 50.5)');

const checkDueDate = (dueDate: LocalDate, today: LocalDate) =>
  dueDate <= addDays(today, DUE_DATE_MAX_DAYS);
const DUE_DATE_MESSAGE = '예정일을 확인해 주세요. 오늘부터 300일 안이어야 해요.';
const BIRTH_DATE_MESSAGE = '태어난 날은 오늘이나 그 전이어야 해요.';

/** 처음 등록: 출산 전이면 예정일, 이미 태어났으면 생년월일 (+ 출생 몸무게 · 키) */
export const registerChildSchema = (today: LocalDate) =>
  z
    .object({
      name: nameSchema,
      stage: z.enum(['expecting', 'born'], { error: '태어났는지 골라 주세요.' }),
      dueDate: optionalDate,
      birthDate: optionalDate,
      sex: sexSchema,
      weightKg: birthWeight,
      heightCm: birthHeight,
    })
    .superRefine((input, ctx) => {
      if (input.stage === 'expecting') {
        if (!input.dueDate) {
          ctx.addIssue({
            code: 'custom',
            path: ['dueDate'],
            message: '출산 예정일을 넣어 주세요.',
          });
        } else if (!checkDueDate(input.dueDate, today)) {
          ctx.addIssue({ code: 'custom', path: ['dueDate'], message: DUE_DATE_MESSAGE });
        }
      } else if (!input.birthDate) {
        ctx.addIssue({ code: 'custom', path: ['birthDate'], message: '태어난 날을 넣어 주세요.' });
      } else if (input.birthDate > today) {
        ctx.addIssue({ code: 'custom', path: ['birthDate'], message: BIRTH_DATE_MESSAGE });
      }
    });
export type RegisterChildInput = z.output<ReturnType<typeof registerChildSchema>>;

const childIdSchema = z.uuid({ error: '잘못된 요청이에요.' });
export const childTargetSchema = z.object({ childId: childIdSchema });

/** 태어났어요: 이름 · 생년월일 · 성별 · 출생 몸무게 · 키 */
export const bornSchema = (today: LocalDate) =>
  z.object({
    childId: childIdSchema,
    name: nameSchema,
    birthDate: localDateSchema.refine((date) => date <= today, { error: BIRTH_DATE_MESSAGE }),
    sex: sexSchema,
    weightKg: birthWeight,
    heightCm: birthHeight,
  });
export type BornInput = z.output<ReturnType<typeof bornSchema>>;

/** 아이 정보 고치기. 생년월일은 태어난 아이만 (출산 전 아이는 '태어났어요'로) */
export const updateChildSchema = (today: LocalDate) =>
  z
    .object({
      childId: childIdSchema,
      name: nameSchema,
      dueDate: optionalDate,
      birthDate: optionalDate,
      sex: sexSchema,
    })
    .superRefine((input, ctx) => {
      if (input.birthDate && input.birthDate > today) {
        ctx.addIssue({ code: 'custom', path: ['birthDate'], message: BIRTH_DATE_MESSAGE });
      }
      if (!input.birthDate && !input.dueDate) {
        ctx.addIssue({ code: 'custom', path: ['dueDate'], message: '출산 예정일을 넣어 주세요.' });
      } else if (!input.birthDate && input.dueDate && !checkDueDate(input.dueDate, today)) {
        ctx.addIssue({ code: 'custom', path: ['dueDate'], message: DUE_DATE_MESSAGE });
      }
    });
export type UpdateChildInput = z.output<ReturnType<typeof updateChildSchema>>;
