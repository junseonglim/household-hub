import { describe, expect, it } from 'vitest';
import { planStandardSchedule, STANDARD_SPECS, standardInfo } from './standard-schedule';
import {
  buildScheduleView,
  describeWindow,
  eventStatus,
  groupEvents,
  type ScheduleEventLike,
} from './status';

const BIRTH = '2027-03-14';
const plan = planStandardSchedule(BIRTH);
const planned = (code: string) => plan.find((event) => event.code === code);

describe('표준 일정 만들기', () => {
  it('접종 31 · 검진 12 · 행정 2 · 기념일 3개를 겹치지 않는 코드로 만든다', () => {
    const count = (kind: string) => plan.filter((event) => event.kind === kind).length;
    expect(count('vaccination')).toBe(31);
    expect(count('checkup')).toBe(12);
    expect(count('admin')).toBe(2);
    expect(count('celebration')).toBe(3);
    expect(new Set(STANDARD_SPECS.map((spec) => spec.code)).size).toBe(STANDARD_SPECS.length);
  });

  it('생후 N개월은 그 달이 끝날 때까지, A~B개월은 B개월이 끝날 때까지', () => {
    expect(planned('dtap-1')).toMatchObject({ dueDate: '2027-05-14', dueUntil: '2027-06-13' });
    expect(planned('checkup-2')).toMatchObject({ dueDate: '2027-07-14', dueUntil: '2027-10-13' });
    expect(planned('dtap-5')).toMatchObject({ dueDate: '2031-03-14', dueUntil: '2034-03-13' });
  });

  it('날짜로 정한 일정 (BCG 4주 안, 1차 검진 14~35일, 신청 기한)', () => {
    expect(planned('bcg')).toMatchObject({ dueDate: BIRTH, dueUntil: '2027-04-11' });
    expect(planned('checkup-1')).toMatchObject({ dueDate: '2027-03-28', dueUntil: '2027-04-18' });
    expect(planned('birth-registration')).toMatchObject({ dueUntil: '2027-04-14' });
    expect(planned('child-benefits')).toMatchObject({ dueUntil: '2027-05-12' });
    expect(planned('day-100')).toMatchObject({ dueDate: '2027-06-21', dueUntil: null });
  });

  it('말일에 태어나면 달을 더할 때 그 달의 말일로 맞춘다', () => {
    const lastDay = planStandardSchedule('2027-01-31');
    expect(lastDay.find((event) => event.code === 'dtap-1')).toMatchObject({
      dueDate: '2027-03-31',
      dueUntil: '2027-04-29',
    });
  });

  it('A형간염 2차는 1차를 한 날부터 6~18개월 뒤', () => {
    expect(planned('hepa-2')).toMatchObject({ dueDate: '2028-09-14', dueUntil: '2030-09-13' });
    const afterFirst = planStandardSchedule(BIRTH, new Map([['hepa-1', '2028-04-01']]));
    expect(afterFirst.find((event) => event.code === 'hepa-2')).toMatchObject({
      dueDate: '2028-10-01',
      dueUntil: '2029-10-01',
    });
  });

  it('권장 시기 문구와 안내를 코드로 찾는다', () => {
    expect(standardInfo('rota-3').hint).toMatch(/로타릭스/);
    expect(standardInfo('dtap-5').timing).toBe('만 4~6세');
    expect(standardInfo(null)).toEqual({ timing: undefined, hint: undefined });
  });
});

const TODAY = '2027-05-20'; // 생후 67일

const events: (ScheduleEventLike & { title: string })[] = plan.map((event) => ({
  ...event,
  id: event.code,
  standardCode: event.code,
  doneOn: null,
  dismissed: false,
}));
const custom = (overrides: Partial<ScheduleEventLike>) => ({
  id: 'custom',
  kind: 'visit',
  standardCode: null,
  dueDate: '2027-05-01',
  dueUntil: null,
  doneOn: null,
  dismissed: false,
  ...overrides,
});
const statusOf = (code: string) =>
  eventStatus(
    events.find((event) => event.id === code)!,
    TODAY,
  );

describe('일정 상태', () => {
  it('권장 기간이 지난 접종 · 검진 · 행정은 놓침, 기간 안이면 지금', () => {
    expect(statusOf('bcg')).toBe('missed');
    expect(statusOf('birth-registration')).toBe('missed');
    expect(statusOf('child-benefits')).toBe('missed');
    expect(statusOf('dtap-1')).toBe('due');
    expect(statusOf('hepb-3')).toBe('upcoming');
  });

  it('기념일 · 병원 방문은 날짜가 지나면 놓침이 아니라 지난 일정', () => {
    expect(statusOf('day-50')).toBe('past');
    expect(eventStatus(custom({ kind: 'visit' }), TODAY)).toBe('past');
    expect(eventStatus(custom({ kind: 'vaccination' }), TODAY)).toBe('missed');
    expect(eventStatus(custom({ dueDate: TODAY }), TODAY)).toBe('due');
  });

  it('한 일정 · 해당 없음이 먼저다', () => {
    expect(eventStatus(custom({ kind: 'vaccination', doneOn: '2027-05-01' }), TODAY)).toBe('done');
    expect(eventStatus(custom({ kind: 'vaccination', dismissed: true }), TODAY)).toBe('dismissed');
  });
});

describe('일정 묶기 · 나누기', () => {
  it('같은 기간의 표준 접종은 한 줄로 묶는다', () => {
    const groups = groupEvents(events, TODAY);
    const twoMonths = groups.find((group) => group.events.some((event) => event.id === 'dtap-1'));
    expect(twoMonths?.events.map((event) => event.id)).toEqual([
      'dtap-1',
      'ipv-1',
      'hib-1',
      'pcv-1',
      'rota-1',
    ]);
    expect(twoMonths?.status).toBe('due');
  });

  it('한 접종은 묶음에서 빠지고 완료 목록으로 간다', () => {
    const withDone = events.map((event) =>
      event.id === 'hib-1' ? { ...event, doneOn: '2027-05-18' } : event,
    );
    const view = buildScheduleView(withDone, TODAY);
    expect(view.done.map((event) => event.id)).toEqual(['hib-1']);
    const due = view.due.find((group) => group.events.some((event) => event.id === 'dtap-1'));
    expect(due?.events).toHaveLength(4);
  });

  it('놓침 · 지금 · 두 달 안 · 그 뒤 · 지난 일정으로 나눈다', () => {
    const view = buildScheduleView(events, TODAY);
    const ids = (groups: { events: { id: string }[] }[]) =>
      groups.flatMap((group) => group.events.map((event) => event.id));
    expect(ids(view.missed)).toEqual([
      'bcg',
      'hepb-1',
      'birth-registration',
      'child-benefits',
      'checkup-1',
      'hepb-2',
    ]);
    expect(ids(view.due)).toEqual(['dtap-1', 'ipv-1', 'hib-1', 'pcv-1', 'rota-1']);
    // 생후 4개월 접종 · 2차 검진(7/14)까지가 두 달 안
    expect(ids(view.soon)).toEqual([
      'day-100',
      'dtap-2',
      'ipv-2',
      'hib-2',
      'pcv-2',
      'rota-2',
      'checkup-2',
    ]);
    expect(view.soon.map((group) => group.events.length)).toEqual([1, 5, 1]);
    expect(ids(view.later)[0]).toBe('hepb-3');
    expect(view.past.map((event) => event.id)).toEqual(['day-50']);
  });

  it('기간을 말로 바꾸고, 다른 해면 연도를 붙인다', () => {
    expect(describeWindow(planned('dtap-1')!, TODAY)).toBe('5/14 (금) ~ 6/13 (일)');
    expect(describeWindow(planned('day-100')!, TODAY)).toBe('6/21 (월)');
    expect(describeWindow(planned('dtap-4')!, TODAY)).toBe('2028년 6/14 (수) ~ 2028년 10/13 (금)');
  });
});
