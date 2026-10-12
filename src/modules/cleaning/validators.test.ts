import { describe, expect, it } from 'vitest';
import { invalidInput } from '@/lib/form-state';
import { setupFieldPrefix } from './form-fields';
import { recurrenceFromForm, setupTasksFromForm, taskFormSchema } from './validators';

const SPACE_ID = '0199d3a4-0000-7000-8000-000000000001';

describe('반복 규칙 입력', () => {
  it('종류별 칸에서 규칙을 만든다', () => {
    expect(recurrenceFromForm({ recurrenceType: 'daily' })).toEqual({
      recurrence: { type: 'daily' },
    });
    expect(recurrenceFromForm({ recurrenceType: 'weekly', weekdays: '5,2' })).toEqual({
      recurrence: { type: 'weekly', weekdays: [5, 2] },
    });
    expect(recurrenceFromForm({ recurrenceType: 'monthly', monthDay: '31' })).toEqual({
      recurrence: { type: 'monthly', day: 31 },
    });
    expect(recurrenceFromForm({ recurrenceType: 'every_n_days', everyDays: ' 14 ' })).toEqual({
      recurrence: { type: 'every_n_days', days: 14 },
    });
    expect(recurrenceFromForm({ recurrenceType: 'once', dueDate: '' })).toEqual({
      recurrence: { type: 'once', dueDate: null },
    });
  });

  it('틀린 칸을 알려 준다', () => {
    expect(recurrenceFromForm({ recurrenceType: 'weekly', weekdays: '' })).toEqual({
      error: { field: 'weekdays', message: '요일을 하나 이상 골라 주세요.' },
    });
    expect(recurrenceFromForm({ recurrenceType: 'every_n_days', everyDays: '0' })).toEqual({
      error: { field: 'everyDays', message: '1일 이상으로 입력해 주세요.' },
    });
    expect(recurrenceFromForm({ recurrenceType: 'every_n_days', everyDays: '2.5' })).toMatchObject({
      error: { field: 'everyDays' },
    });
    expect(recurrenceFromForm({ recurrenceType: 'once', dueDate: '2026-02-30' })).toEqual({
      error: { field: 'dueDate', message: '날짜를 확인해 주세요.' },
    });
    expect(recurrenceFromForm({})).toEqual({
      error: { field: 'recurrenceType', message: '반복을 골라 주세요.' },
    });
  });

  it('접두어가 붙은 칸도 읽는다 (처음 설정 화면)', () => {
    expect(recurrenceFromForm({ 't3.recurrenceType': 'weekly', 't3.weekdays': '' }, 't3.')).toEqual(
      { error: { field: 't3.weekdays', message: '요일을 하나 이상 골라 주세요.' } },
    );
  });
});

describe('할 일 등록 폼', () => {
  const base = {
    title: ' 화장실 청소 ',
    spaceId: SPACE_ID,
    recurrenceType: 'weekly',
    weekdays: '6',
    startDate: '2026-10-11',
    assigneeMemberId: '',
    estimatedMinutes: '',
    note: '',
  };

  it('빈 칸은 null로 바꾼다', () => {
    expect(taskFormSchema.parse(base)).toEqual({
      title: '화장실 청소',
      spaceId: SPACE_ID,
      recurrence: { type: 'weekly', weekdays: [6] },
      startDate: '2026-10-11',
      assigneeMemberId: null,
      estimatedMinutes: null,
      note: null,
    });
  });

  it('칸마다 오류를 돌려준다', () => {
    const result = taskFormSchema.safeParse({
      ...base,
      title: '',
      weekdays: '',
      estimatedMinutes: '0',
      startDate: '2026-02-30',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(invalidInput(result.error).fieldErrors).toEqual({
      title: '할 일 이름을 입력해 주세요.',
      estimatedMinutes: '1분 이상으로 입력해 주세요.',
      startDate: '날짜를 확인해 주세요.',
    });
  });

  it('다른 칸이 맞으면 반복 규칙 오류를 알려 준다', () => {
    const result = taskFormSchema.safeParse({ ...base, weekdays: '' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(invalidInput(result.error).fieldErrors).toEqual({
      weekdays: '요일을 하나 이상 골라 주세요.',
    });
  });
});

describe('처음 설정 폼', () => {
  it('고른 항목만 템플릿 제목으로 등록한다', () => {
    const first = setupFieldPrefix(0);
    const second = setupFieldPrefix(1);
    const result = setupTasksFromForm(
      {
        [`${first}selected`]: 'on',
        [`${first}spaceId`]: SPACE_ID,
        [`${first}recurrenceType`]: 'every_n_days',
        [`${first}everyDays`]: '3',
        [`${second}recurrenceType`]: 'daily',
      },
      '2026-10-11',
    );
    expect(result).toEqual({
      tasks: [
        {
          title: '청소기 돌리기',
          spaceId: SPACE_ID,
          recurrence: { type: 'every_n_days', days: 3 },
          startDate: '2026-10-11',
          assigneeMemberId: null,
          estimatedMinutes: null,
          note: null,
        },
      ],
    });
  });

  it('고른 항목의 반복 규칙이 틀리면 그 칸에 오류', () => {
    const prefix = setupFieldPrefix(1);
    expect(
      setupTasksFromForm(
        { [`${prefix}selected`]: 'on', [`${prefix}recurrenceType`]: 'weekly' },
        '2026-10-11',
      ),
    ).toEqual({ fieldErrors: { [`${prefix}weekdays`]: '요일을 하나 이상 골라 주세요.' } });
  });
});
