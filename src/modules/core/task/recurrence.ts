import {
  addDays,
  daysInMonth,
  diffDays,
  formatShortDate,
  maxDate,
  weekdayOf,
  WEEKDAY_LABELS,
  type LocalDate,
} from '@/lib/local-date';

// 할 일 엔진의 반복 규칙 (docs/03-architecture.md 6.1절).
// 반복 회차를 미리 만들지 않고, 할 일마다 다음 예정일(next_due_date) 하나만 계산해 둔다.
// 순수 함수라서 서버(완료 처리)와 브라우저(등록 화면 미리보기) 양쪽에서 쓴다.

/** 0 = 일요일 … 6 = 토요일 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Recurrence =
  /** 1회성. 기한은 없어도 된다 */
  | { type: 'once'; dueDate: LocalDate | null }
  | { type: 'daily' }
  /** [2, 5] = 화 · 금 */
  | { type: 'weekly'; weekdays: Weekday[] }
  /** 1~31. 그 날짜가 없는 달은 말일 */
  | { type: 'monthly'; day: number }
  /** 완료한 날부터 N일 뒤 */
  | { type: 'every_n_days'; days: number };

export type RecurrenceType = Recurrence['type'];

export const RECURRENCE_TYPES = [
  'once',
  'daily',
  'weekly',
  'monthly',
  'every_n_days',
] as const satisfies readonly RecurrenceType[];

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  once: '한 번만',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  every_n_days: 'N일마다',
};

/** 이 날이 반복 일정에 해당하는지 (일정 기준 규칙만) */
function occursOn(rule: Recurrence, date: LocalDate): boolean {
  switch (rule.type) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.weekdays.includes(weekdayOf(date) as Weekday);
    case 'monthly': {
      const [year, month, day] = date.split('-').map(Number) as [number, number, number];
      return day === Math.min(rule.day, daysInMonth(year, month));
    }
    default:
      return false;
  }
}

/** from 이후(from 포함) 첫 발생일. 일정 기준 규칙은 늦어도 한 달 + 며칠 안에 반드시 한 번 온다. */
function firstOccurrenceFrom(rule: Recurrence, from: LocalDate): LocalDate {
  for (let offset = 0; offset < 62; offset++) {
    const date = addDays(from, offset);
    if (occursOn(rule, date)) return date;
  }
  throw new Error(`반복 규칙에 해당하는 날짜가 없습니다: ${JSON.stringify(rule)}`);
}

/** 할 일을 만들 때의 첫 예정일. 1회성에 기한이 없으면 null */
export function firstDueDate(rule: Recurrence, startDate: LocalDate): LocalDate | null {
  switch (rule.type) {
    case 'once':
      return rule.dueDate;
    case 'every_n_days':
      return startDate;
    default:
      return firstOccurrenceFrom(rule, startDate);
  }
}

/**
 * 완료한 뒤의 다음 예정일. null이면 더 이상 예정이 없다 (1회성).
 * - 일정 기준(매일 · 매주 · 매월): max(예정일, 완료일) **다음**의 첫 발생일.
 *   미리 하면 이번 회차를 한 것으로, 늦게 하면 밀린 회차는 쌓지 않고 다음 회차로 넘어간다.
 * - 완료 기준(N일마다): 완료일 + N일
 */
export function nextDueDate(
  rule: Recurrence,
  dueDate: LocalDate | null,
  completedOn: LocalDate,
): LocalDate | null {
  switch (rule.type) {
    case 'once':
      return null;
    case 'every_n_days':
      return addDays(completedOn, rule.days);
    default: {
      const base = dueDate ? maxDate(dueDate, completedOn) : completedOn;
      return firstOccurrenceFrom(rule, addDays(base, 1));
    }
  }
}

type Schedule = { recurrence: Recurrence; startDate: LocalDate };

/**
 * 할 일을 고친 뒤의 시작일 · 다음 예정일 (서버 저장과 수정 화면 미리보기가 함께 쓴다).
 * - 시작일을 바꾸면 그날부터 다시 계산한다.
 * - 반복 규칙만 바꾸면 오늘(시작일이 아직 안 왔으면 시작일)부터 다시 계산한다.
 *   N일마다는 마지막으로 한 날이 있으면 그날부터 센다 (방금 한 일이 오늘 다시 뜨지 않도록).
 * - 둘 다 그대로면 다음 예정일을 건드리지 않는다.
 */
export function scheduleAfterEdit(
  current: Schedule & { nextDueDate: LocalDate | null },
  next: Schedule,
  { today, lastCompletedOn }: { today: LocalDate; lastCompletedOn: LocalDate | null },
): { startDate: LocalDate; nextDueDate: LocalDate | null } {
  const rule = next.recurrence;
  if (rule.type !== 'once' && next.startDate !== current.startDate) {
    return { startDate: next.startDate, nextDueDate: firstDueDate(rule, next.startDate) };
  }
  if (sameRecurrence(current.recurrence, rule)) {
    return { startDate: current.startDate, nextDueDate: current.nextDueDate };
  }
  const startDate = maxDate(today, current.startDate);
  if (rule.type === 'every_n_days' && lastCompletedOn) {
    return { startDate, nextDueDate: addDays(lastCompletedOn, rule.days) };
  }
  return { startDate, nextDueDate: firstDueDate(rule, startDate) };
}

/** 미리보기: 첫 예정일부터 제때 완료한다고 가정한 앞으로의 예정일 */
export function upcomingDueDates(
  rule: Recurrence,
  firstDue: LocalDate | null,
  count: number,
): LocalDate[] {
  const dates: LocalDate[] = [];
  let due = firstDue;
  while (due && dates.length < count) {
    dates.push(due);
    due = nextDueDate(rule, due, due);
  }
  return dates;
}

/** 두 규칙이 같은지 (요일 순서는 무시) */
export function sameRecurrence(a: Recurrence, b: Recurrence): boolean {
  return JSON.stringify(normalizeRecurrence(a)) === JSON.stringify(normalizeRecurrence(b));
}

/** 요일을 정렬하고 중복을 없앤다 (저장 · 비교 전에 맞춰 둔다) */
export function normalizeRecurrence(rule: Recurrence): Recurrence {
  if (rule.type !== 'weekly') return rule;
  return { type: 'weekly', weekdays: normalizeWeekdays(rule.weekdays) };
}

function normalizeWeekdays(weekdays: Weekday[]): Weekday[] {
  return [...new Set(weekdays)].sort((a, b) => a - b);
}

/** '매일', '매주 화·금', '매월 1일', '3일마다', '한 번 (10/10까지)' */
export function describeRecurrence(rule: Recurrence): string {
  switch (rule.type) {
    case 'once':
      return rule.dueDate ? `한 번 (${formatShortDate(rule.dueDate)}까지)` : '한 번';
    case 'daily':
      return '매일';
    case 'weekly':
      return rule.weekdays.length === 7
        ? '매일'
        : `매주 ${normalizeWeekdays(rule.weekdays)
            .map((day) => WEEKDAY_LABELS[day])
            .join('·')}`;
    case 'monthly':
      return rule.day >= 31 ? '매월 말일' : `매월 ${rule.day}일`;
    case 'every_n_days':
      return `${rule.days}일마다`;
  }
}

/** 화면 묶음 (docs/03-architecture.md 6.1절 상태 분류) */
export type DueStatus = 'overdue' | 'today' | 'this_week' | 'later' | 'no_due' | 'done';

export function dueStatus(
  task: { recurrence: Recurrence; nextDueDate: LocalDate | null; lastCompletedAt: Date | null },
  today: LocalDate,
): DueStatus {
  if (task.nextDueDate === null) {
    return task.recurrence.type === 'once' && task.lastCompletedAt ? 'done' : 'no_due';
  }
  const days = diffDays(task.nextDueDate, today);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 6) return 'this_week';
  return 'later';
}

/** 목록에 보여 줄 예정일 문구: '3일 지남', '오늘', '내일', '10/17 (토)' */
export function describeDue(nextDueDate: LocalDate | null, today: LocalDate): string {
  if (!nextDueDate) return '기한 없음';
  return diffDays(nextDueDate, today) <= 1
    ? describeDaysUntil(nextDueDate, today)
    : formatShortDate(nextDueDate);
}

/** 상세 화면용 남은 날: '3일 지남', '오늘', '내일', '5일 뒤' */
export function describeDaysUntil(dueDate: LocalDate, today: LocalDate): string {
  const days = diffDays(dueDate, today);
  if (days < 0) return `${-days}일 지남`;
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  return `${days}일 뒤`;
}
