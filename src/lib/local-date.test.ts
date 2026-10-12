import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  formatDaysAgo,
  formatFullDate,
  formatShortDate,
  formatTimeOfDay,
  fullMonthsBetween,
  instantFromLocalDateTime,
  isValidLocalDate,
  localDateOf,
  localDateTimeOf,
  startOfWeek,
  todayIn,
  weekDates,
  weekdayOf,
} from './local-date';

describe('날짜 계산', () => {
  it('없는 날짜를 걸러낸다', () => {
    expect(isValidLocalDate('2026-02-28')).toBe(true);
    expect(isValidLocalDate('2026-02-29')).toBe(false);
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(isValidLocalDate('2026-1-1')).toBe(false);
    expect(isValidLocalDate('')).toBe(false);
  });

  it('달 · 해를 넘겨 더하고 뺀다', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-01', '2026-10-25')).toBe(7);
    expect(diffDays('2026-10-25', '2026-11-01')).toBe(-7);
  });

  it('달을 더하면 같은 날, 그 달에 없는 날이면 말일', () => {
    expect(addMonths('2027-03-14', 2)).toBe('2027-05-14');
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2027-11-30', 3)).toBe('2028-02-29');
    expect(addMonths('2027-03-14', 12)).toBe('2028-03-14');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
    expect(addMonths('2027-03-14', -3)).toBe('2026-12-14');
  });

  it('꽉 찬 달 수를 센다 (생후 N개월)', () => {
    expect(fullMonthsBetween('2027-03-14', '2027-03-14')).toBe(0);
    expect(fullMonthsBetween('2027-03-14', '2027-04-13')).toBe(0);
    expect(fullMonthsBetween('2027-03-14', '2027-04-14')).toBe(1);
    expect(fullMonthsBetween('2027-01-31', '2027-02-28')).toBe(1);
    expect(fullMonthsBetween('2027-03-14', '2028-03-13')).toBe(11);
    expect(fullMonthsBetween('2027-03-14', '2028-03-14')).toBe(12);
    expect(fullMonthsBetween('2027-03-14', '2027-01-01')).toBe(0);
  });

  it('요일을 구한다 (0 = 일요일)', () => {
    expect(weekdayOf('2026-10-10')).toBe(6);
    expect(weekdayOf('2026-10-11')).toBe(0);
    expect(formatShortDate('2026-10-17')).toBe('10/17 (토)');
    expect(formatFullDate('2027-03-15')).toBe('2027년 3월 15일 (월)');
    expect(formatTimeOfDay('00:05')).toBe('오전 12:05');
    expect(formatTimeOfDay('09:30')).toBe('오전 9:30');
    expect(formatTimeOfDay('12:00')).toBe('오후 12:00');
    expect(formatTimeOfDay('14:30')).toBe('오후 2:30');
  });

  it('한 주는 월요일부터 일요일까지', () => {
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05'); // 일요일 → 그 주 월요일
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12'); // 월요일
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28'); // 달을 넘긴다
    expect(weekDates('2026-10-05')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('며칠 전인지 말로 바꾼다', () => {
    expect(formatDaysAgo('2026-10-11', '2026-10-11')).toBe('오늘');
    expect(formatDaysAgo('2026-10-10', '2026-10-11')).toBe('어제');
    expect(formatDaysAgo('2026-10-02', '2026-10-11')).toBe('9일 전');
  });
});

describe('가구 시간대', () => {
  // 한국 시각 10/11 오전 8시 30분 = UTC 10/10 23시 30분
  const instant = new Date('2026-10-10T23:30:00Z');

  it("'오늘'은 서버 시간대가 아니라 가구 시간대로 정한다", () => {
    expect(todayIn('Asia/Seoul', instant)).toBe('2026-10-11');
    expect(todayIn('UTC', instant)).toBe('2026-10-10');
    expect(localDateOf(new Date('2026-10-11T14:59:59Z'), 'Asia/Seoul')).toBe('2026-10-11');
    expect(localDateOf(new Date('2026-10-11T15:00:00Z'), 'Asia/Seoul')).toBe('2026-10-12');
  });

  it('입력 칸의 현지 시각과 실제 시각을 오간다', () => {
    expect(localDateTimeOf(instant, 'Asia/Seoul')).toBe('2026-10-11T08:30');
    expect(instantFromLocalDateTime('2026-10-11T08:30', 'Asia/Seoul')?.toISOString()).toBe(
      instant.toISOString(),
    );
    expect(instantFromLocalDateTime('2026-10-11T00:00', 'Asia/Seoul')?.toISOString()).toBe(
      '2026-10-10T15:00:00.000Z',
    );
  });

  it('서머타임이 있는 시간대도 맞게 바꾼다', () => {
    // 뉴욕: 7월은 UTC-4, 12월은 UTC-5
    expect(instantFromLocalDateTime('2026-07-01T12:00', 'America/New_York')?.toISOString()).toBe(
      '2026-07-01T16:00:00.000Z',
    );
    expect(instantFromLocalDateTime('2026-12-01T12:00', 'America/New_York')?.toISOString()).toBe(
      '2026-12-01T17:00:00.000Z',
    );
  });

  it('형식이 틀린 시각은 null', () => {
    expect(instantFromLocalDateTime('2026-10-11', 'Asia/Seoul')).toBeNull();
    expect(instantFromLocalDateTime('2026-02-30T10:00', 'Asia/Seoul')).toBeNull();
    expect(instantFromLocalDateTime('2026-10-11T24:00', 'Asia/Seoul')).toBeNull();
  });
});
