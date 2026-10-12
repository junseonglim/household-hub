import { describe, expect, it } from 'vitest';
import {
  describeDaysUntil,
  describeDue,
  describeRecurrence,
  dueStatus,
  firstDueDate,
  nextDueDate,
  scheduleAfterEdit,
  sameRecurrence,
  upcomingDueDates,
  type Recurrence,
} from './recurrence';

// 2026년 10월: 10/10이 토요일
const SAT: Recurrence = { type: 'weekly', weekdays: [6] };
const TUE_FRI: Recurrence = { type: 'weekly', weekdays: [5, 2] };

describe('첫 예정일', () => {
  it('일정 기준은 시작일 이후 첫 발생일', () => {
    expect(firstDueDate({ type: 'daily' }, '2026-10-11')).toBe('2026-10-11');
    expect(firstDueDate(SAT, '2026-10-11')).toBe('2026-10-17');
    expect(firstDueDate(SAT, '2026-10-10')).toBe('2026-10-10');
    expect(firstDueDate(TUE_FRI, '2026-10-07')).toBe('2026-10-09');
  });

  it('매월은 이번 달 날짜가 지났으면 다음 달, 없는 날짜는 말일', () => {
    expect(firstDueDate({ type: 'monthly', day: 1 }, '2026-10-11')).toBe('2026-11-01');
    expect(firstDueDate({ type: 'monthly', day: 15 }, '2026-10-11')).toBe('2026-10-15');
    expect(firstDueDate({ type: 'monthly', day: 31 }, '2026-11-05')).toBe('2026-11-30');
    expect(firstDueDate({ type: 'monthly', day: 30 }, '2027-02-01')).toBe('2027-02-28');
    expect(firstDueDate({ type: 'monthly', day: 29 }, '2028-02-01')).toBe('2028-02-29');
  });

  it('N일마다는 시작일, 1회성은 정한 기한', () => {
    expect(firstDueDate({ type: 'every_n_days', days: 14 }, '2026-10-11')).toBe('2026-10-11');
    expect(firstDueDate({ type: 'once', dueDate: '2026-10-20' }, '2026-10-11')).toBe('2026-10-20');
    expect(firstDueDate({ type: 'once', dueDate: null }, '2026-10-11')).toBeNull();
  });
});

describe('완료 후 다음 예정일 (docs/03-architecture.md 6.1절 예시)', () => {
  it.each([
    ['제때', SAT, '2026-10-10', '2026-10-10', '2026-10-17'],
    ['이번 회차를 미리 함', SAT, '2026-10-10', '2026-10-08', '2026-10-17'],
    ['밀린 회차는 쌓이지 않음', SAT, '2026-10-10', '2026-10-13', '2026-10-17'],
    ['여러 요일', TUE_FRI, '2026-10-06', '2026-10-06', '2026-10-09'],
    ['완료일 기준', { type: 'every_n_days', days: 14 }, '2026-10-10', '2026-10-13', '2026-10-27'],
    [
      '31일이 없는 달은 말일',
      { type: 'monthly', day: 31 },
      '2026-10-31',
      '2026-10-31',
      '2026-11-30',
    ],
  ] satisfies [string, Recurrence, string, string, string][])(
    '%s',
    (_name, rule, due, completedOn, expected) => {
      expect(nextDueDate(rule, due, completedOn)).toBe(expected);
    },
  );

  it('매일: 밀렸다가 하면 내일, 오늘 하면 내일', () => {
    expect(nextDueDate({ type: 'daily' }, '2026-10-05', '2026-10-11')).toBe('2026-10-12');
    expect(nextDueDate({ type: 'daily' }, '2026-10-11', '2026-10-11')).toBe('2026-10-12');
  });

  it('매월: 말일 다음은 다시 원래 날짜', () => {
    const rule: Recurrence = { type: 'monthly', day: 31 };
    expect(nextDueDate(rule, '2026-11-30', '2026-11-30')).toBe('2026-12-31');
    expect(nextDueDate(rule, '2027-01-31', '2027-02-02')).toBe('2027-02-28');
  });

  it('해를 넘긴다', () => {
    expect(nextDueDate({ type: 'monthly', day: 1 }, '2026-12-01', '2026-12-01')).toBe('2027-01-01');
    expect(nextDueDate(SAT, '2026-12-26', '2026-12-26')).toBe('2027-01-02');
  });

  it('1회성은 다음 예정이 없다', () => {
    expect(nextDueDate({ type: 'once', dueDate: '2026-10-10' }, '2026-10-10', '2026-10-11')).toBe(
      null,
    );
  });
});

describe('할 일을 고쳤을 때', () => {
  const current = {
    recurrence: { type: 'every_n_days', days: 14 } as Recurrence,
    startDate: '2026-09-01',
    nextDueDate: '2026-10-20',
  };
  const options = { today: '2026-10-11', lastCompletedOn: '2026-10-06' };

  it('규칙 · 시작일이 그대로면 다음 예정일도 그대로', () => {
    expect(scheduleAfterEdit(current, current, options)).toEqual({
      startDate: '2026-09-01',
      nextDueDate: '2026-10-20',
    });
  });

  it('시작일을 바꾸면 그날부터 다시 계산한다', () => {
    expect(scheduleAfterEdit(current, { ...current, startDate: '2026-10-15' }, options)).toEqual({
      startDate: '2026-10-15',
      nextDueDate: '2026-10-15',
    });
  });

  it('규칙만 바꾸면 오늘부터 다시 계산한다', () => {
    expect(scheduleAfterEdit(current, { ...current, recurrence: SAT }, options)).toEqual({
      startDate: '2026-10-11',
      nextDueDate: '2026-10-17',
    });
  });

  it('N일마다로 바꾸면 마지막으로 한 날부터 센다', () => {
    const next = { ...current, recurrence: { type: 'every_n_days', days: 10 } as Recurrence };
    expect(scheduleAfterEdit(current, next, options).nextDueDate).toBe('2026-10-16');
    expect(
      scheduleAfterEdit(current, next, { ...options, lastCompletedOn: null }).nextDueDate,
    ).toBe('2026-10-11');
  });

  it('아직 시작 전이면 시작일부터 다시 계산한다', () => {
    const future = { ...current, startDate: '2026-11-01', nextDueDate: '2026-11-01' };
    expect(scheduleAfterEdit(future, { ...future, recurrence: SAT }, options)).toEqual({
      startDate: '2026-11-01',
      nextDueDate: '2026-11-07',
    });
  });
});

describe('미리보기 · 비교 · 설명', () => {
  it('앞으로의 예정일', () => {
    expect(upcomingDueDates(SAT, '2026-10-10', 3)).toEqual([
      '2026-10-10',
      '2026-10-17',
      '2026-10-24',
    ]);
    expect(upcomingDueDates({ type: 'every_n_days', days: 3 }, '2026-10-11', 3)).toEqual([
      '2026-10-11',
      '2026-10-14',
      '2026-10-17',
    ]);
    expect(upcomingDueDates({ type: 'once', dueDate: '2026-10-20' }, '2026-10-20', 3)).toEqual([
      '2026-10-20',
    ]);
    expect(upcomingDueDates({ type: 'once', dueDate: null }, null, 3)).toEqual([]);
  });

  it('요일 순서가 달라도 같은 규칙', () => {
    expect(sameRecurrence(TUE_FRI, { type: 'weekly', weekdays: [2, 5] })).toBe(true);
    expect(sameRecurrence(TUE_FRI, { type: 'weekly', weekdays: [2] })).toBe(false);
    expect(sameRecurrence({ type: 'daily' }, { type: 'every_n_days', days: 1 })).toBe(false);
  });

  it('규칙을 말로 설명한다', () => {
    expect(describeRecurrence(TUE_FRI)).toBe('매주 화·금');
    expect(describeRecurrence({ type: 'monthly', day: 1 })).toBe('매월 1일');
    expect(describeRecurrence({ type: 'monthly', day: 31 })).toBe('매월 말일');
    expect(describeRecurrence({ type: 'every_n_days', days: 14 })).toBe('14일마다');
    expect(describeRecurrence({ type: 'once', dueDate: null })).toBe('한 번');
    expect(describeRecurrence({ type: 'once', dueDate: '2026-10-20' })).toBe(
      '한 번 (10/20 (화)까지)',
    );
  });
});

describe('상태 분류', () => {
  const today = '2026-10-11';
  const daily: Recurrence = { type: 'daily' };
  const status = (
    nextDueDate: string | null,
    rule: Recurrence = daily,
    lastCompletedAt: Date | null = null,
  ) => dueStatus({ recurrence: rule, nextDueDate, lastCompletedAt }, today);

  it('예정일과 오늘을 비교해 묶는다', () => {
    expect(status('2026-10-10')).toBe('overdue');
    expect(status('2026-10-11')).toBe('today');
    expect(status('2026-10-12')).toBe('this_week');
    expect(status('2026-10-17')).toBe('this_week');
    expect(status('2026-10-18')).toBe('later');
  });

  it('1회성: 기한이 없으면 기한 없음, 완료했으면 완료됨', () => {
    const once: Recurrence = { type: 'once', dueDate: null };
    expect(status(null, once)).toBe('no_due');
    expect(status(null, once, new Date())).toBe('done');
  });

  it('예정일 문구', () => {
    expect(describeDue('2026-10-08', today)).toBe('3일 지남');
    expect(describeDue('2026-10-11', today)).toBe('오늘');
    expect(describeDue('2026-10-12', today)).toBe('내일');
    expect(describeDue('2026-10-15', today)).toBe('10/15 (목)');
    expect(describeDue(null, today)).toBe('기한 없음');
    expect(describeDaysUntil('2026-10-20', today)).toBe('9일 뒤');
    expect(describeDaysUntil('2026-10-10', today)).toBe('1일 지남');
  });
});
