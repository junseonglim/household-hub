import { describe, expect, it } from 'vitest';
import { addCareSchema, updateCareSchema } from './validators';

const context = { timezone: 'Asia/Seoul', now: new Date('2027-03-20T12:00:00+09:00') };
const CHILD_ID = '0199d6a0-0000-7000-8000-000000000001';
const LOG_ID = '0199d6a0-0000-7000-8000-000000000002';
const add = (values: Record<string, string>) =>
  addCareSchema(context).safeParse({ childId: CHILD_ID, at: '2027-03-20T11:30', ...values });
const errorsOf = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('새 기록', () => {
  it('분유는 칩으로 고른 양, 없으면 직접 쓴 양', () => {
    expect(add({ type: 'feeding', method: 'formula', amountMl: '120' }).data?.input).toMatchObject({
      details: { method: 'formula', amountMl: 120 },
      endedAt: null,
    });
    expect(
      add({ type: 'feeding', method: 'pumped', amountMlCustom: '95' }).data?.input.details,
    ).toEqual({ method: 'pumped', amountMl: 95 });
    expect(errorsOf(add({ type: 'feeding', method: 'formula', amountMlCustom: '0' }))).toEqual([
      'amountMlCustom',
    ]);
  });

  it('모유 직수는 분을 쓰면 그 시각에 끝난 것으로, 비우면 타이머 시작', () => {
    const manual = add({ type: 'feeding', method: 'breast', side: 'left', minutes: '15' });
    expect(manual.data?.input.startedAt.toISOString()).toBe('2027-03-20T02:15:00.000Z');
    expect(manual.data?.input.endedAt?.toISOString()).toBe('2027-03-20T02:30:00.000Z');
    const timer = add({ type: 'feeding', method: 'breast', side: 'right' });
    expect(timer.data?.input).toMatchObject({ endedAt: null, details: { side: 'right' } });
    expect(errorsOf(add({ type: 'feeding', method: 'breast' }))).toEqual(['side']);
  });

  it('기저귀 · 체온 · 약', () => {
    expect(add({ type: 'diaper', kind: 'both' }).data?.input.details).toEqual({ kind: 'both' });
    expect(add({ type: 'temperature', celsius: '37.84' }).data?.input.details).toEqual({
      celsius: 37.8,
    });
    expect(errorsOf(add({ type: 'temperature', celsius: '3.78' }))).toEqual(['celsius']);
    expect(add({ type: 'medicine', name: ' 해열제 ', dose: '' }).data?.input.details).toEqual({
      name: '해열제',
      dose: null,
    });
    expect(errorsOf(add({ type: 'medicine', name: '' }))).toEqual(['name']);
  });

  it('미래 시각은 넣을 수 없다 (1분 여유)', () => {
    expect(errorsOf(add({ type: 'diaper', kind: 'wet', at: '2027-03-20T12:05' }))).toEqual(['at']);
    expect(add({ type: 'diaper', kind: 'wet', at: '2027-03-20T12:01' }).success).toBe(true);
  });
});

describe('기록 고치기', () => {
  const update = (values: Record<string, string>) =>
    updateCareSchema(context).safeParse({ logId: LOG_ID, at: '2027-03-20T09:00', ...values });

  it('수면은 끝 시각을 비우면 진행 중, 넣으면 시작보다 뒤여야 한다', () => {
    expect(update({ type: 'sleep' }).data?.input.endedAt).toBeNull();
    expect(
      update({ type: 'sleep', endAt: '2027-03-20T10:30' }).data?.input.endedAt?.toISOString(),
    ).toBe('2027-03-20T01:30:00.000Z');
    expect(errorsOf(update({ type: 'sleep', endAt: '2027-03-20T08:30' }))).toEqual(['endAt']);
  });

  it('타이머가 아닌 기록은 끝 시각을 무시한다', () => {
    expect(
      update({ type: 'diaper', kind: 'wet', endAt: '2027-03-20T10:30' }).data?.input.endedAt,
    ).toBeNull();
  });
});
