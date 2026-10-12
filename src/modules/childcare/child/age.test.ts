import { describe, expect, it } from 'vitest';
import {
  ageOf,
  celebrationsOf,
  describeAge,
  describeAgeOn,
  describePregnancy,
  formatDday,
  nextCelebration,
  pregnancyOf,
} from './age';

describe('출산 전', () => {
  it('예정일까지 남은 날과 임신 주수를 구한다 (40주 - 남은 날)', () => {
    const pregnancy = pregnancyOf('2027-03-15', '2026-10-12');
    expect(pregnancy).toEqual({ daysLeft: 154, weeks: 18, days: 0 });
    expect(describePregnancy(pregnancy)).toBe('임신 18주');
    expect(describePregnancy(pregnancyOf('2027-03-15', '2026-10-15'))).toBe('임신 18주 3일');
    expect(formatDday(pregnancy.daysLeft)).toBe('D-154');
  });

  it('예정일 당일 · 지난 뒤에도 주수를 센다', () => {
    expect(pregnancyOf('2027-03-15', '2027-03-15')).toEqual({ daysLeft: 0, weeks: 40, days: 0 });
    expect(formatDday(0)).toBe('D-day');
    const late = pregnancyOf('2027-03-15', '2027-03-18');
    expect(formatDday(late.daysLeft)).toBe('D+3');
    expect(describePregnancy(late)).toBe('임신 40주 3일');
  });

  it('예정일을 너무 멀리 잡아도 주수가 음수가 되지 않는다', () => {
    expect(pregnancyOf('2027-10-12', '2026-10-12')).toMatchObject({ weeks: 0, days: 0 });
  });
});

describe('생후', () => {
  it('태어난 날은 생후 0일, 2주까지는 날짜만', () => {
    expect(describeAge(ageOf('2027-03-14', '2027-03-14'))).toBe('생후 0일');
    expect(describeAge(ageOf('2027-03-14', '2027-03-27'))).toBe('생후 13일');
  });

  it('2주부터는 주, 두 달부터는 개월을 함께 보여 준다', () => {
    expect(describeAge(ageOf('2027-03-14', '2027-04-06'))).toBe('생후 23일 · 3주');
    expect(describeAge(ageOf('2027-03-14', '2027-05-14'))).toBe('생후 61일 · 2개월');
    expect(describeAge(ageOf('2027-03-14', '2028-03-13'))).toBe('생후 365일 · 11개월');
    expect(describeAge(ageOf('2027-03-14', '2029-04-01'))).toBe('생후 24개월 · 만 2세');
  });

  it('목록에는 짧게: 한 달 전엔 날, 두 살 전엔 개월 · 날, 그 뒤엔 나이', () => {
    expect(describeAgeOn('2027-03-14', '2027-03-14')).toBe('생후 0일');
    expect(describeAgeOn('2027-03-14', '2027-04-06')).toBe('생후 23일');
    expect(describeAgeOn('2027-03-14', '2027-05-14')).toBe('생후 2개월');
    expect(describeAgeOn('2027-03-14', '2027-05-17')).toBe('생후 2개월 3일');
    expect(describeAgeOn('2027-03-14', '2029-04-20')).toBe('만 2세 1개월');
  });

  it('기념일: 50일 · 100일은 태어난 날을 1일째로, 돌은 1년 뒤 같은 날', () => {
    expect(celebrationsOf('2027-03-14')).toEqual([
      { code: 'day-50', title: '50일', date: '2027-05-02' },
      { code: 'day-100', title: '100일', date: '2027-06-21' },
      { code: 'first-birthday', title: '돌', date: '2028-03-14' },
    ]);
    // 2월 29일생의 돌은 2월 28일
    expect(celebrationsOf('2028-02-29')[2]?.date).toBe('2029-02-28');
  });

  it('오늘이거나 다가오는 가장 가까운 기념일', () => {
    expect(nextCelebration('2027-03-14', '2027-05-02')).toMatchObject({
      title: '50일',
      daysLeft: 0,
    });
    expect(nextCelebration('2027-03-14', '2027-05-03')).toMatchObject({
      title: '100일',
      daysLeft: 49,
    });
    expect(nextCelebration('2027-03-14', '2028-03-15')).toBeNull();
  });
});
