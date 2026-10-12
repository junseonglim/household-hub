import { z } from 'zod';
import { instantFromLocalDateTime } from '@/lib/local-date';
import {
  BREAST_SIDES,
  CARE_LOG_TYPES,
  DIAPER_KINDS,
  FEEDING_METHODS,
  type CareLogType,
} from '../constants';
import type { CareLogDetails } from '../schema';

// 신생아 기록 폼 해석 (docs/modules/childcare.md 4.2절 '입력 방식').
// 폼 값은 모두 문자열이라 여기서 기록 한 건(CareInput)으로 바꾼다. '지금'과 가구 시간대가 필요해 스키마를 만들어 쓴다.

/** 미래 시각은 저장하지 않는다 (청소 완료와 같은 1분 여유) */
const FUTURE_GRACE_MS = 60 * 1000;

export type CareInput = {
  type: CareLogType;
  startedAt: Date;
  /** 타이머(수면 · 직수)를 시작하면 null */
  endedAt: Date | null;
  details: CareLogDetails;
  note: string | null;
};

type Context = { timezone: string; now: Date };

const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null);

/** 숫자 칸: 빈칸이면 null, 숫자가 아니면 NaN (뒤에서 오류로) */
const toNumber = (value: string | null) => (value === null ? null : Number(value));

const fields = {
  type: z.enum(CARE_LOG_TYPES, { error: '무엇을 기록할지 골라 주세요.' }),
  at: z.string().optional(),
  endAt: z.string().optional(),
  note: optionalString.pipe(z.string().max(200, '메모는 200자까지 쓸 수 있어요.').nullable()),
  method: optionalString,
  side: optionalString,
  minutes: optionalString,
  amountMl: optionalString,
  amountMlCustom: optionalString,
  kind: optionalString,
  celsius: optionalString,
  name: optionalString,
  dose: optionalString,
};

type RawFields = z.output<z.ZodObject<typeof fields>>;
type Issue = { path: string; message: string };

function parseInstant(value: string | undefined, { timezone, now }: Context, path: string) {
  if (!value) return { issue: { path, message: '시각을 넣어 주세요.' } };
  const instant = instantFromLocalDateTime(value, timezone);
  if (!instant) return { issue: { path, message: '시각을 확인해 주세요.' } };
  if (instant.getTime() > now.getTime() + FUTURE_GRACE_MS) {
    return { issue: { path, message: '지금보다 뒤의 시각은 넣을 수 없어요.' } };
  }
  return { instant };
}

function toIntInRange(value: string | null, min: number, max: number) {
  const number = toNumber(value);
  return number !== null && Number.isInteger(number) && number >= min && number <= max
    ? number
    : null;
}

/** 종류별 내용. 틀린 칸은 issues에 담는다 */
function parseDetails(raw: RawFields, issues: Issue[]): CareLogDetails {
  const fail = (path: string, message: string) => {
    issues.push({ path, message });
    return {} as CareLogDetails;
  };
  switch (raw.type) {
    case 'feeding': {
      const method = FEEDING_METHODS.find((option) => option === raw.method);
      if (!method) return fail('method', '모유 · 유축 모유 · 분유 중에서 골라 주세요.');
      if (method === 'breast') {
        const side = BREAST_SIDES.find((option) => option === raw.side);
        if (!side) return fail('side', '어느 쪽인지 골라 주세요.');
        return { method, side };
      }
      // 칩을 눌렀으면 그 양, 아니면 직접 쓴 양
      const amountMl = toIntInRange(raw.amountMl ?? raw.amountMlCustom, 1, 500);
      if (amountMl === null) return fail('amountMlCustom', '양을 ml로 써 주세요. (1~500)');
      return { method, amountMl };
    }
    case 'diaper': {
      const kind = DIAPER_KINDS.find((option) => option === raw.kind);
      if (!kind) return fail('kind', '소변 · 대변 중에서 골라 주세요.');
      return { kind };
    }
    case 'sleep':
      return {};
    case 'temperature': {
      const celsius = toNumber(raw.celsius);
      if (celsius === null || !Number.isFinite(celsius) || celsius < 34 || celsius > 42) {
        return fail('celsius', '체온을 확인해 주세요. (34.0~42.0)');
      }
      return { celsius: Math.round(celsius * 10) / 10 };
    }
    case 'medicine': {
      if (!raw.name) return fail('name', '약 이름을 써 주세요.');
      if (raw.name.length > 30) return fail('name', '약 이름은 30자까지 쓸 수 있어요.');
      if (raw.dose && raw.dose.length > 20) return fail('dose', '양은 20자까지 쓸 수 있어요.');
      return { name: raw.name, dose: raw.dose };
    }
  }
}

function withIssues(schema: z.ZodType, build: (raw: RawFields, issues: Issue[]) => unknown) {
  return schema.transform((raw, ctx) => {
    const issues: Issue[] = [];
    const result = build(raw as RawFields, issues);
    for (const issue of issues) {
      ctx.addIssue({ code: 'custom', path: [issue.path], message: issue.message });
    }
    return issues.length > 0 ? z.NEVER : result;
  });
}

/**
 * 새 기록. 시각(at)은 기본이 지금.
 * 모유 직수는 몇 분 했는지 쓰면 그 시각에 끝난 것으로, 비워 두면 그 시각부터 타이머를 시작한다.
 */
export const addCareSchema = (context: Context) =>
  withIssues(
    z.object({ childId: z.uuid({ error: '잘못된 요청이에요.' }), ...fields }),
    (raw, issues) => {
      const { instant, issue } = parseInstant(raw.at, context, 'at');
      if (issue) issues.push(issue);
      const details = parseDetails(raw, issues);
      if (!instant || issues.length > 0) return null;

      let startedAt = instant;
      let endedAt: Date | null = null;
      if (raw.type === 'feeding' && 'method' in details && details.method === 'breast') {
        if (raw.minutes) {
          const minutes = toIntInRange(raw.minutes, 1, 180);
          if (minutes === null) {
            issues.push({ path: 'minutes', message: '몇 분 했는지 숫자로 써 주세요. (1~180)' });
            return null;
          }
          startedAt = new Date(instant.getTime() - minutes * 60 * 1000);
          endedAt = instant;
        }
      }
      return {
        childId: (raw as RawFields & { childId: string }).childId,
        input: { type: raw.type, startedAt, endedAt, details, note: raw.note } satisfies CareInput,
      };
    },
  ) as z.ZodType<{ childId: string; input: CareInput }>;

/** 기록 고치기. 수면 · 직수는 끝 시각을 비우면 진행 중으로 둔다 */
export const updateCareSchema = (context: Context) =>
  withIssues(
    z.object({ logId: z.uuid({ error: '잘못된 요청이에요.' }), ...fields }),
    (raw, issues) => {
      const start = parseInstant(raw.at, context, 'at');
      if (start.issue) issues.push(start.issue);
      const details = parseDetails(raw, issues);
      const isTimer =
        raw.type === 'sleep' ||
        (raw.type === 'feeding' && 'method' in details && details.method === 'breast');
      let endedAt: Date | null = null;
      if (isTimer && raw.endAt) {
        const end = parseInstant(raw.endAt, context, 'endAt');
        if (end.issue) issues.push(end.issue);
        else if (start.instant && end.instant! <= start.instant) {
          issues.push({ path: 'endAt', message: '끝 시각은 시작 시각보다 뒤여야 해요.' });
        } else endedAt = end.instant!;
      }
      if (!start.instant || issues.length > 0) return null;
      return {
        logId: (raw as RawFields & { logId: string }).logId,
        input: {
          type: raw.type,
          startedAt: start.instant,
          endedAt,
          details,
          note: raw.note,
        } satisfies CareInput,
      };
    },
  ) as z.ZodType<{ logId: string; input: CareInput }>;

export const careTargetSchema = z.object({ logId: z.uuid({ error: '잘못된 요청이에요.' }) });
export const childTargetSchema = z.object({ childId: z.uuid({ error: '잘못된 요청이에요.' }) });
