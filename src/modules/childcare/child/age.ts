import { addDays, addMonths, diffDays, fullMonthsBetween, type LocalDate } from '@/lib/local-date';

// 출산까지 · 임신 주수 · 생후 날짜 · 기념일 (docs/modules/childcare.md 5절 '날짜 · 나이').
// DB와 무관한 순수 함수라 단위 테스트로 검증한다.

const FULL_TERM_DAYS = 280; // 40주

export type Pregnancy = {
  /** 예정일 - 오늘. 음수면 예정일이 지났다 */
  daysLeft: number;
  /** 임신 주수 = 40주 - (예정일 - 오늘) */
  weeks: number;
  days: number;
};

export function pregnancyOf(dueDate: LocalDate, today: LocalDate): Pregnancy {
  const daysLeft = diffDays(dueDate, today);
  const elapsed = Math.max(0, FULL_TERM_DAYS - daysLeft);
  return { daysLeft, weeks: Math.floor(elapsed / 7), days: elapsed % 7 };
}

/** 'D-152' · 'D-day' · 'D+3' */
export function formatDday(daysLeft: number): string {
  if (daysLeft === 0) return 'D-day';
  return daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
}

/** '임신 18주 3일' */
export function describePregnancy({ weeks, days }: Pregnancy): string {
  return days === 0 ? `임신 ${weeks}주` : `임신 ${weeks}주 ${days}일`;
}

export type Age = {
  /** 생후 N일 (태어난 날 = 0) */
  days: number;
  weeks: number;
  /** 꽉 찬 달 수 */
  months: number;
};

export function ageOf(birthDate: LocalDate, today: LocalDate): Age {
  const days = Math.max(0, diffDays(today, birthDate));
  return { days, weeks: Math.floor(days / 7), months: fullMonthsBetween(birthDate, today) };
}

/** 2주까지는 '생후 N일', 그 뒤로는 주 · 개월을 함께 */
export function describeAge({ days, weeks, months }: Age): string {
  if (days < 14) return `생후 ${days}일`;
  if (months < 2) return `생후 ${days}일 · ${weeks}주`;
  if (months < 24) return `생후 ${days}일 · ${months}개월`;
  return `생후 ${months}개월 · 만 ${Math.floor(months / 12)}세`;
}

export type Celebration = { code: string; title: string; date: LocalDate };

/** 50일 · 100일은 태어난 날을 1일째로 센다 (관습). 돌은 1년 뒤 같은 날 */
export const CELEBRATION_RULES = [
  { code: 'day-50', title: '50일', dateOf: (birth: LocalDate) => addDays(birth, 49) },
  { code: 'day-100', title: '100일', dateOf: (birth: LocalDate) => addDays(birth, 99) },
  { code: 'first-birthday', title: '돌', dateOf: (birth: LocalDate) => addMonths(birth, 12) },
] as const;

export function celebrationsOf(birthDate: LocalDate): Celebration[] {
  return CELEBRATION_RULES.map(({ code, title, dateOf }) => ({
    code,
    title,
    date: dateOf(birthDate),
  }));
}

/** 오늘이거나 아직 오지 않은 가장 가까운 기념일 */
export function nextCelebration(
  birthDate: LocalDate,
  today: LocalDate,
): (Celebration & { daysLeft: number }) | null {
  const next = celebrationsOf(birthDate).find((celebration) => celebration.date >= today);
  return next ? { ...next, daysLeft: diffDays(next.date, today) } : null;
}
