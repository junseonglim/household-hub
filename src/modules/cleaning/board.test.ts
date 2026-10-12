import { describe, expect, it } from 'vitest';
import type { Recurrence } from '@/modules/core/task/recurrence';
import { buildBoard, summarizeSpaces } from './board';

const today = '2026-10-11';
const now = new Date('2026-10-11T03:00:00Z');
const daily: Recurrence = { type: 'daily' };

function makeTask(
  title: string,
  overrides: Partial<{
    recurrence: Recurrence;
    nextDueDate: string | null;
    lastCompletedAt: Date | null;
    assigneeMemberId: string | null;
    spaceId: string | null;
  }> = {},
) {
  return {
    title,
    recurrence: daily,
    nextDueDate: today,
    lastCompletedAt: null,
    assigneeMemberId: null,
    spaceId: null,
    ...overrides,
  };
}

describe('할 일 화면 묶기', () => {
  it('예정일에 따라 묶고, 묶음 안에서는 예정일 순', () => {
    const board = buildBoard(
      [
        makeTask('나중', { nextDueDate: '2026-10-30' }),
        makeTask('어제 것', { nextDueDate: '2026-10-10' }),
        makeTask('사흘 지남', { nextDueDate: '2026-10-08' }),
        makeTask('오늘'),
        makeTask('모레', { nextDueDate: '2026-10-13' }),
        makeTask('기한 없음', { recurrence: { type: 'once', dueDate: null }, nextDueDate: null }),
      ],
      { today, now },
    );
    expect(board.overdue.map((task) => task.title)).toEqual(['사흘 지남', '어제 것']);
    expect(board.today.map((task) => task.title)).toEqual(['오늘']);
    expect(board.this_week.map((task) => task.title)).toEqual(['모레']);
    expect(board.later.map((task) => task.title)).toEqual(['나중']);
    expect(board.no_due.map((task) => task.title)).toEqual(['기한 없음']);
  });

  it('완료한 1회성은 7일 동안만 완료됨에 보인다', () => {
    const once: Recurrence = { type: 'once', dueDate: null };
    const board = buildBoard(
      [
        makeTask('어제 끝냄', {
          recurrence: once,
          nextDueDate: null,
          lastCompletedAt: new Date('2026-10-10T03:00:00Z'),
        }),
        makeTask('열흘 전에 끝냄', {
          recurrence: once,
          nextDueDate: null,
          lastCompletedAt: new Date('2026-10-01T03:00:00Z'),
        }),
      ],
      { today, now },
    );
    expect(board.done.map((task) => task.title)).toEqual(['어제 끝냄']);
  });

  it("'내 담당'은 나에게 맡겨진 일과 누구나 할 수 있는 일", () => {
    const board = buildBoard(
      [
        makeTask('내 일', { assigneeMemberId: 'me' }),
        makeTask('배우자 일', { assigneeMemberId: 'spouse' }),
        makeTask('누구나'),
      ],
      { today, now, onlyFor: 'me' },
    );
    expect(board.today.map((task) => task.title)).toEqual(['내 일', '누구나']);
  });
});

describe('공간별 요약', () => {
  const spaces = [
    { id: 'bath', name: '욕실', icon: '🛁' },
    { id: 'kitchen', name: '주방', icon: '🍳' },
  ];

  it('공간마다 할 일 · 밀린 일 수와 가장 오래 안 한 일', () => {
    const [bath, kitchen] = summarizeSpaces(
      spaces,
      [
        makeTask('화장실 청소', {
          spaceId: 'bath',
          nextDueDate: '2026-10-08',
          lastCompletedAt: new Date('2026-10-01T00:00:00Z'),
        }),
        makeTask('수건 정리', {
          spaceId: 'bath',
          lastCompletedAt: new Date('2026-10-10T00:00:00Z'),
        }),
      ],
      today,
    );
    expect(bath).toMatchObject({ taskCount: 2, overdueCount: 1, todayCount: 1 });
    expect(bath?.stalest?.title).toBe('화장실 청소');
    expect(kitchen).toMatchObject({ taskCount: 0, stalest: null });
  });

  it('한 번도 안 한 일이 가장 오래 안 한 일', () => {
    const [bath] = summarizeSpaces(
      spaces,
      [
        makeTask('한 적 있음', { spaceId: 'bath', lastCompletedAt: new Date('2026-09-01') }),
        makeTask('한 적 없음', { spaceId: 'bath' }),
      ],
      today,
    );
    expect(bath?.stalest).toEqual({ title: '한 적 없음', lastCompletedAt: null });
  });

  it('공간이 없는 할 일은 마지막에 따로 모은다', () => {
    const summaries = summarizeSpaces(spaces, [makeTask('어딘가')], today);
    expect(summaries.at(-1)).toMatchObject({ id: null, name: '공간 없음', taskCount: 1 });
    expect(summarizeSpaces(spaces, [], today)).toHaveLength(2);
  });
});
