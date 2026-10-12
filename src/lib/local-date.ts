// 시각 없는 날짜('YYYY-MM-DD')와 가구 시간대 계산 (docs/03-architecture.md 7절).
// 날짜 계산은 시간대 영향을 받지 않도록 UTC 자정으로 바꿔서 한다.
// 서버 · 브라우저 어디서나 쓸 수 있는 순수 함수만 둔다.

/** 'YYYY-MM-DD' 형식의 날짜 */
export type LocalDate = string;

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(date: LocalDate): number {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`날짜 형식이 아닙니다: ${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 형식이 맞고 실제로 있는 날짜인지 (2월 30일 등은 false) */
export function isValidLocalDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  return fromUtcMs(toUtcMs(value)) === value;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** a - b (일) */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / DAY_MS);
}

/** 0 = 일요일 … 6 = 토요일 */
export function weekdayOf(date: LocalDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}

type ZonedParts = { year: string; month: string; day: string; hour: string; minute: string };

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** 그 시각이 가구 시간대로 며칠인지 */
export function localDateOf(instant: Date, timeZone: string): LocalDate {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${month}-${day}`;
}

/** 가구 시간대의 오늘 */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  return localDateOf(now, timeZone);
}

/** `<input type="datetime-local">` 값 ('YYYY-MM-DDTHH:mm') */
export function localDateTimeOf(instant: Date, timeZone: string): string {
  const { year, month, day, hour, minute } = zonedParts(instant, timeZone);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** 가구 시간대의 'YYYY-MM-DDTHH:mm'을 실제 시각으로 바꾼다. 형식이 틀리면 null */
export function instantFromLocalDateTime(value: string, timeZone: string): Date | null {
  const match = DATE_TIME_PATTERN.exec(value);
  if (!match || !isValidLocalDate(value.slice(0, 10))) return null;
  const [hour, minute] = [Number(match[4]), Number(match[5])];
  if (hour > 23 || minute > 59) return null;

  // 그 시간대의 시차를 구해 빼 준다. 서머타임 경계를 위해 한 번 더 맞춘다.
  const wallClockMs = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hour,
    minute,
  );
  let guess = wallClockMs;
  for (let i = 0; i < 2; i++) {
    const parts = zonedParts(new Date(guess), timeZone);
    const shownMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    guess += wallClockMs - shownMs;
  }
  return new Date(guess);
}

/** '10/17 (토)' */
export function formatShortDate(date: LocalDate): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day} (${WEEKDAY_LABELS[weekdayOf(date)]})`;
}

/** 지난 날짜를 '오늘' · '어제' · 'N일 전'으로 */
export function formatDaysAgo(date: LocalDate, today: LocalDate): string {
  const days = diffDays(today, date);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}
