import { addDays, addMonths, type LocalDate } from '@/lib/local-date';
import { CELEBRATION_RULES } from '../child/age';
import type { HealthEventKind } from '../constants';

// 생년월일로 만드는 표준 일정 (docs/modules/childcare.md 6절).
// 기준: 질병관리청 표준예방접종일정표, 국민건강보험공단 영유아 건강검진 · 구강검진.
// 2026-10-12에 예방접종도우미 · 표준예방접종일정표와 대조했다. 일정표가 바뀌면 여기만 고친다.
// 이미 만든 일정의 코드(code)는 바꾸지 않는다 (아이마다 코드로 찾아 날짜를 다시 계산한다).

type Window = { dueDate: LocalDate; dueUntil: LocalDate | null };

/** 생후 from~to개월: from개월이 되는 날부터 to개월이 끝나는 날(to + 1개월 전날)까지 */
const months =
  (from: number, to = from) =>
  (birth: LocalDate): Window => ({
    dueDate: addMonths(birth, from),
    dueUntil: addDays(addMonths(birth, to + 1), -1),
  });

/** 생후 from~to일 */
const days =
  (from: number, to: number) =>
  (birth: LocalDate): Window => ({ dueDate: addDays(birth, from), dueUntil: addDays(birth, to) });

type StandardSpec = {
  code: string;
  kind: Exclude<HealthEventKind, 'prenatal' | 'visit' | 'appointment'>;
  title: string;
  /** 권장 시기 문구. 기념일은 날짜만 보여 주므로 없다 */
  timing?: string;
  /** 화면에 함께 보여 줄 짧은 안내 */
  hint?: string;
  window: (birth: LocalDate) => Window;
  /** 앞 차수를 한 날부터 계산하는 일정 (A형간염 2차: 1차 6~18개월 뒤) */
  after?: { code: string; fromMonths: number; toMonths: number };
};

const AGE_4_TO_6 = { timing: '만 4~6세', window: months(48, 83) };

const VACCINATIONS: StandardSpec[] = [
  { code: 'bcg', title: 'BCG (결핵)', timing: '생후 4주 안', window: days(0, 28) },
  { code: 'hepb-1', title: 'B형간염 1차', timing: '출생 시', window: months(0) },
  { code: 'hepb-2', title: 'B형간염 2차', timing: '생후 1개월', window: months(1) },
  { code: 'hepb-3', title: 'B형간염 3차', timing: '생후 6개월', window: months(6) },
  { code: 'dtap-1', title: 'DTaP 1차', timing: '생후 2개월', window: months(2) },
  { code: 'dtap-2', title: 'DTaP 2차', timing: '생후 4개월', window: months(4) },
  { code: 'dtap-3', title: 'DTaP 3차', timing: '생후 6개월', window: months(6) },
  { code: 'dtap-4', title: 'DTaP 4차', timing: '생후 15~18개월', window: months(15, 18) },
  { code: 'dtap-5', title: 'DTaP 5차', ...AGE_4_TO_6 },
  { code: 'ipv-1', title: 'IPV(폴리오) 1차', timing: '생후 2개월', window: months(2) },
  { code: 'ipv-2', title: 'IPV(폴리오) 2차', timing: '생후 4개월', window: months(4) },
  { code: 'ipv-3', title: 'IPV(폴리오) 3차', timing: '생후 6~18개월', window: months(6, 18) },
  { code: 'ipv-4', title: 'IPV(폴리오) 4차', ...AGE_4_TO_6 },
  { code: 'hib-1', title: 'Hib 1차', timing: '생후 2개월', window: months(2) },
  { code: 'hib-2', title: 'Hib 2차', timing: '생후 4개월', window: months(4) },
  { code: 'hib-3', title: 'Hib 3차', timing: '생후 6개월', window: months(6) },
  { code: 'hib-4', title: 'Hib 4차', timing: '생후 12~15개월', window: months(12, 15) },
  { code: 'pcv-1', title: '폐렴구균 1차', timing: '생후 2개월', window: months(2) },
  { code: 'pcv-2', title: '폐렴구균 2차', timing: '생후 4개월', window: months(4) },
  { code: 'pcv-3', title: '폐렴구균 3차', timing: '생후 6개월', window: months(6) },
  { code: 'pcv-4', title: '폐렴구균 4차', timing: '생후 12~15개월', window: months(12, 15) },
  {
    code: 'rota-1',
    title: '로타바이러스 1차',
    timing: '생후 2개월',
    hint: '1차는 생후 15주 전에 시작하고, 모든 차수를 생후 8개월 전에 마쳐요.',
    window: months(2),
  },
  { code: 'rota-2', title: '로타바이러스 2차', timing: '생후 4개월', window: months(4) },
  {
    code: 'rota-3',
    title: '로타바이러스 3차 (로타텍만)',
    timing: '생후 6개월',
    hint: '로타릭스(2회)를 맞았다면 [해당 없음]으로 숨겨 주세요.',
    window: months(6),
  },
  { code: 'mmr-1', title: 'MMR 1차', timing: '생후 12~15개월', window: months(12, 15) },
  { code: 'mmr-2', title: 'MMR 2차', ...AGE_4_TO_6 },
  { code: 'var', title: '수두', timing: '생후 12~15개월', window: months(12, 15) },
  { code: 'hepa-1', title: 'A형간염 1차', timing: '생후 12~23개월', window: months(12, 23) },
  {
    code: 'hepa-2',
    title: 'A형간염 2차',
    timing: '1차 6~18개월 뒤',
    window: months(18, 41),
    after: { code: 'hepa-1', fromMonths: 6, toMonths: 18 },
  },
  {
    code: 'je-1',
    title: '일본뇌염 1차',
    timing: '생후 12~23개월',
    hint: '백신(불활성화 · 생백신)에 따라 다음 차수가 달라요. 1차를 맞으면 다음 일정을 직접 추가해 주세요.',
    window: months(12, 23),
  },
  {
    code: 'flu-1',
    title: '인플루엔자 첫 접종',
    timing: '생후 6개월부터 매년',
    hint: '첫해에는 4주 간격으로 2회 맞아요. 접종 기간(보통 가을~이듬해 봄)을 확인하세요.',
    window: months(6, 11),
  },
].map((spec) => ({ ...spec, kind: 'vaccination' as const }));

const CHECKUP_MONTHS: [number, number][] = [
  [4, 6],
  [9, 12],
  [18, 24],
  [30, 36],
  [42, 48],
  [54, 60],
  [66, 71],
];
const DENTAL_MONTHS: [number, number][] = [
  [18, 29],
  [30, 41],
  [42, 53],
  [54, 65],
];

const CHECKUPS: StandardSpec[] = [
  {
    code: 'checkup-1',
    kind: 'checkup',
    title: '영유아 건강검진 1차',
    timing: '생후 14~35일',
    window: days(14, 35),
  },
  ...CHECKUP_MONTHS.map(([from, to], index) => ({
    code: `checkup-${index + 2}`,
    kind: 'checkup' as const,
    title: `영유아 건강검진 ${index + 2}차`,
    timing: `생후 ${from}~${to}개월`,
    window: months(from, to),
  })),
  ...DENTAL_MONTHS.map(([from, to], index) => ({
    code: `dental-${index + 1}`,
    kind: 'checkup' as const,
    title: `영유아 구강검진 ${index + 1}차`,
    timing: `생후 ${from}~${to}개월`,
    window: months(from, to),
  })),
];

const ADMIN: StandardSpec[] = [
  {
    code: 'birth-registration',
    kind: 'admin',
    title: '출생신고',
    timing: '출생 후 1개월 안',
    hint: '주민센터나 정부24에서 해요.',
    window: (birth) => ({ dueDate: birth, dueUntil: addMonths(birth, 1) }),
  },
  {
    code: 'child-benefits',
    kind: 'admin',
    title: '부모급여 · 아동수당 · 첫만남이용권 신청',
    timing: '출생일 포함 60일 안',
    hint: '늦으면 부모급여 · 아동수당을 태어난 달부터 받지 못해요. 출생신고 때 함께 신청할 수 있어요.',
    window: (birth) => ({ dueDate: birth, dueUntil: addDays(birth, 59) }),
  },
];

const CELEBRATIONS: StandardSpec[] = CELEBRATION_RULES.map(({ code, title, dateOf }) => ({
  code,
  kind: 'celebration',
  title,
  window: (birth) => ({ dueDate: dateOf(birth), dueUntil: null }),
}));

export const STANDARD_SPECS: readonly StandardSpec[] = [
  ...VACCINATIONS,
  ...CHECKUPS,
  ...ADMIN,
  ...CELEBRATIONS,
];

const SPEC_BY_CODE = new Map(STANDARD_SPECS.map((spec) => [spec.code, spec]));

/** 표준 일정의 권장 시기 문구 · 안내 (DB에는 날짜만 저장한다) */
export function standardInfo(code: string | null): { timing?: string; hint?: string } {
  const spec = code ? SPEC_BY_CODE.get(code) : undefined;
  return { timing: spec?.timing, hint: spec?.hint };
}

export type PlannedEvent = {
  code: string;
  kind: StandardSpec['kind'];
  title: string;
  dueDate: LocalDate;
  dueUntil: LocalDate | null;
};

/**
 * 생년월일로 표준 일정을 계산한다.
 * @param doneOnByCode 이미 한 일정의 날짜 — 앞 차수를 한 날부터 세는 일정(A형간염 2차)에 쓴다
 */
export function planStandardSchedule(
  birthDate: LocalDate,
  doneOnByCode: ReadonlyMap<string, LocalDate> = new Map(),
): PlannedEvent[] {
  return STANDARD_SPECS.map((spec) => {
    let window = spec.window(birthDate);
    const previousDoneOn = spec.after && doneOnByCode.get(spec.after.code);
    if (spec.after && previousDoneOn) {
      window = {
        dueDate: addMonths(previousDoneOn, spec.after.fromMonths),
        dueUntil: addMonths(previousDoneOn, spec.after.toMonths),
      };
    }
    return { code: spec.code, kind: spec.kind, title: spec.title, ...window };
  });
}
