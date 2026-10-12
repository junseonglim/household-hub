import { diffDays, type LocalDate } from '@/lib/local-date';

// 성장 기록 계산 (docs/modules/childcare.md 4.4절). 순수 함수.

export type GrowthMetric = 'weightKg' | 'heightCm' | 'headCm';

export const GROWTH_METRICS: { key: GrowthMetric; label: string; unit: string; digits: number }[] =
  [
    { key: 'weightKg', label: '몸무게', unit: 'kg', digits: 2 },
    { key: 'heightCm', label: '키', unit: 'cm', digits: 1 },
    { key: 'headCm', label: '머리둘레', unit: 'cm', digits: 1 },
  ];

export type GrowthRow = {
  id: string;
  measuredOn: LocalDate;
  weightKg: number | null;
  heightCm: number | null;
  headCm: number | null;
  note: string | null;
};

/** '3.25kg' · '50.5cm' */
export function formatMeasure(value: number, metric: GrowthMetric): string {
  const { unit, digits } = GROWTH_METRICS.find((item) => item.key === metric)!;
  return `${Number(value.toFixed(digits))}${unit}`;
}

/** '+0.4' · '-0.1' · '0' (단위 없이) */
export function formatDelta(delta: number, metric: GrowthMetric): string {
  const { digits } = GROWTH_METRICS.find((item) => item.key === metric)!;
  const rounded = Number(delta.toFixed(digits));
  if (rounded === 0) return '0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/**
 * 측정마다 지난번보다 얼마나 늘었는지. 항목별로 그 항목을 잰 바로 전 기록과 비교한다.
 * @param rows 날짜순 (오래된 것부터)
 */
export function withDeltas<T extends GrowthRow>(
  rows: T[],
): (T & { deltas: Record<GrowthMetric, number | null> })[] {
  const last: Record<GrowthMetric, number | null> = {
    weightKg: null,
    heightCm: null,
    headCm: null,
  };
  return rows.map((row) => {
    const deltas = { weightKg: null, heightCm: null, headCm: null } as Record<
      GrowthMetric,
      number | null
    >;
    for (const { key } of GROWTH_METRICS) {
      const value = row[key];
      if (value === null) continue;
      if (last[key] !== null) deltas[key] = value - last[key];
      last[key] = value;
    }
    return { ...row, deltas };
  });
}

export type ChartPoint = { ageDays: number; value: number; date: LocalDate };

/** 그래프 점: 가로 = 생후 날짜, 세로 = 값 (그 항목을 잰 기록만) */
export function chartPoints(
  rows: GrowthRow[],
  birthDate: LocalDate,
  metric: GrowthMetric,
): ChartPoint[] {
  return rows
    .filter((row) => row[metric] !== null)
    .map((row) => ({
      ageDays: diffDays(row.measuredOn, birthDate),
      value: row[metric]!,
      date: row.measuredOn,
    }))
    .sort((a, b) => a.ageDays - b.ageDays);
}

const DAYS_PER_MONTH = 30.4375;

/** 가로축 눈금 (개월): 기간에 맞춰 1 · 3 · 6 · 12개월 간격 */
export function monthTicks(maxDays: number): { days: number; label: string }[] {
  const months = maxDays / DAYS_PER_MONTH;
  const step = months <= 6 ? 1 : months <= 18 ? 3 : months <= 36 ? 6 : 12;
  const ticks: { days: number; label: string }[] = [];
  for (let month = 0; month <= Math.ceil(months); month += step) {
    ticks.push({ days: month * DAYS_PER_MONTH, label: month === 0 ? '출생' : `${month}개월` });
  }
  return ticks;
}
