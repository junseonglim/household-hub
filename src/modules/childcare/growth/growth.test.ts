import { describe, expect, it } from 'vitest';
import {
  chartPoints,
  formatDelta,
  formatMeasure,
  monthTicks,
  withDeltas,
  type GrowthRow,
} from './growth';

const row = (measuredOn: string, values: Partial<GrowthRow>): GrowthRow => ({
  id: measuredOn,
  measuredOn,
  weightKg: null,
  heightCm: null,
  headCm: null,
  note: null,
  ...values,
});

const rows = [
  row('2027-03-14', { weightKg: 3.25, heightCm: 50.5 }),
  row('2027-04-14', { weightKg: 4.4, headCm: 37 }),
  row('2027-05-14', { weightKg: 5.1, heightCm: 58.2, headCm: 39.1 }),
];

describe('성장 기록', () => {
  it('값을 단위와 함께, 늘어난 양을 부호와 함께 보여 준다', () => {
    expect(formatMeasure(3.25, 'weightKg')).toBe('3.25kg');
    expect(formatMeasure(50, 'heightCm')).toBe('50cm');
    expect(formatDelta(1.1500000001, 'weightKg')).toBe('+1.15');
    expect(formatDelta(-0.1, 'heightCm')).toBe('-0.1');
    expect(formatDelta(0.001, 'weightKg')).toBe('0');
  });

  it('항목마다 그 항목을 잰 바로 전 기록과 비교한다', () => {
    const [birth, oneMonth, twoMonths] = withDeltas(rows);
    expect(birth!.deltas).toEqual({ weightKg: null, heightCm: null, headCm: null });
    expect(oneMonth!.deltas.weightKg).toBeCloseTo(1.15);
    expect(oneMonth!.deltas.heightCm).toBeNull();
    // 키는 한 달 건너뛰어 출생 때와 비교
    expect(twoMonths!.deltas.heightCm).toBeCloseTo(7.7);
    expect(twoMonths!.deltas.headCm).toBeCloseTo(2.1);
  });

  it('그래프 점은 그 항목을 잰 기록만, 생후 날짜순', () => {
    expect(chartPoints(rows, '2027-03-14', 'heightCm')).toEqual([
      { ageDays: 0, value: 50.5, date: '2027-03-14' },
      { ageDays: 61, value: 58.2, date: '2027-05-14' },
    ]);
  });

  it('가로축 눈금은 기간에 맞춰 간격을 넓힌다', () => {
    expect(monthTicks(61).map((tick) => tick.label)).toEqual(['출생', '1개월', '2개월', '3개월']);
    expect(monthTicks(365).map((tick) => tick.label)).toEqual([
      '출생',
      '3개월',
      '6개월',
      '9개월',
      '12개월',
    ]);
  });
});
