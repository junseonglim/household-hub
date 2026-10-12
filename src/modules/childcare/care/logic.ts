import {
  addDays,
  diffDays,
  formatShortDate,
  formatTimeOfDay,
  instantFromLocalDateTime,
  localDateOf,
  localDateTimeOf,
  type LocalDate,
} from '@/lib/local-date';
import {
  BREAST_SIDE_LABELS,
  DIAPER_KIND_LABELS,
  FEEDING_METHOD_LABELS,
  type BreastSide,
  type CareLogType,
} from '../constants';
import type { CareLogDetails } from '../schema';

// 신생아 기록 계산 (docs/modules/childcare.md 5절 '신생아 기록'). 서버 · 브라우저 어디서나 쓰는 순수 함수.

export type CareRecord = {
  id: string;
  type: CareLogType;
  startedAt: Date;
  /** 수면 · 모유 직수만. null이면 진행 중 */
  endedAt: Date | null;
  details: CareLogDetails;
  note: string | null;
  recordedByName: string | null;
};

const MINUTE_MS = 60 * 1000;

const detailsOf = (record: Pick<CareRecord, 'details'>) =>
  record.details as Partial<Record<string, string | number | null>>;

type TimerLike = { type: string; details: CareLogDetails };

/** 수면 · 모유 직수는 시작 → 끝 타이머로 기록한다 */
export function isTimerRecord(record: TimerLike): boolean {
  return (
    record.type === 'sleep' || (record.type === 'feeding' && detailsOf(record).method === 'breast')
  );
}

export function isRunning(record: TimerLike & { endedAt: Date | null }): boolean {
  return isTimerRecord(record) && record.endedAt === null;
}

/** 진행 중이면 지금까지 (분) */
export function durationMinutes(
  record: Pick<CareRecord, 'startedAt' | 'endedAt'>,
  now: Date,
): number {
  const end = record.endedAt ?? now;
  return Math.max(0, Math.floor((end.getTime() - record.startedAt.getTime()) / MINUTE_MS));
}

/** '1시간 12분' · '45분' · '2시간' */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

/** '방금' · '25분 전' · '2시간 10분 전' · '3일 전' */
export function formatElapsed(from: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - from.getTime()) / MINUTE_MS);
  if (minutes < 1) return '방금';
  if (minutes < 24 * 60) return `${formatDuration(minutes)} 전`;
  return `${Math.floor(minutes / (24 * 60))}일 전`;
}

/** '오후 3:22' (가구 시간대) */
export function formatClock(instant: Date, timeZone: string): string {
  return formatTimeOfDay(localDateTimeOf(instant, timeZone).slice(11));
}

/** '오늘 오후 9:40' · '어제 오후 9:40' · '3/18 (수) 오후 9:40' */
export function formatDayTime(instant: Date, timeZone: string, today: LocalDate): string {
  const date = localDateOf(instant, timeZone);
  const days = diffDays(today, date);
  const day = days === 0 ? '오늘' : days === 1 ? '어제' : formatShortDate(date);
  return `${day} ${formatClock(instant, timeZone)}`;
}

/** 그날 0시부터 다음 날 0시까지 (가구 시간대) */
export function dayBounds(date: LocalDate, timeZone: string): { start: Date; end: Date } {
  return {
    start: instantFromLocalDateTime(`${date}T00:00`, timeZone)!,
    end: instantFromLocalDateTime(`${addDays(date, 1)}T00:00`, timeZone)!,
  };
}

/**
 * 다음에 먹일 쪽: 마지막 직수가 왼쪽이면 오른쪽, 오른쪽이면 왼쪽.
 * 양쪽이었으면 마지막에 먹인 쪽을 알 수 없으므로 null.
 * @param records 최근 기록이 앞에 오도록 정렬된 목록
 */
export function nextBreastSide(records: CareRecord[]): BreastSide | null {
  const lastBreast = records.find(
    (record) => record.type === 'feeding' && detailsOf(record).method === 'breast',
  );
  const side = lastBreast && detailsOf(lastBreast).side;
  if (side === 'left') return 'right';
  if (side === 'right') return 'left';
  return null;
}

/** 타임라인 · 마지막 수유에 쓰는 한 줄: '분유 120ml' · '모유 왼쪽 15분' · '소변 · 대변' */
export function describeCareRecord(record: CareRecord, now: Date): string {
  const details = detailsOf(record);
  const running = isRunning(record);
  switch (record.type) {
    case 'feeding': {
      const method = details.method as keyof typeof FEEDING_METHOD_LABELS;
      if (method === 'breast') {
        const side = BREAST_SIDE_LABELS[details.side as BreastSide];
        return running
          ? `모유 ${side} · 먹는 중`
          : `모유 ${side} ${formatDuration(durationMinutes(record, now))}`;
      }
      return `${FEEDING_METHOD_LABELS[method]} ${details.amountMl}ml`;
    }
    case 'diaper':
      return DIAPER_KIND_LABELS[details.kind as keyof typeof DIAPER_KIND_LABELS];
    case 'sleep':
      return running ? '수면 · 자는 중' : `수면 ${formatDuration(durationMinutes(record, now))}`;
    case 'temperature':
      return `체온 ${Number(details.celsius).toFixed(1)}℃`;
    case 'medicine':
      return ['약', details.name, details.dose].filter(Boolean).join(' · ');
  }
}

export type DaySummary = {
  feedings: number;
  formulaMl: number;
  pumpedMl: number;
  breastMinutes: number;
  wet: number;
  dirty: number;
  sleepMinutes: number;
};

/**
 * 하루 합계. 수유 · 기저귀는 그날 시작한 기록을 센다.
 * 수면은 자정을 넘으면 그날에 걸친 시간만 더하고, 진행 중이면 지금까지로 계산한다.
 */
export function summarizeDay(
  records: CareRecord[],
  { start, end, now }: { start: Date; end: Date; now: Date },
): DaySummary {
  const summary: DaySummary = {
    feedings: 0,
    formulaMl: 0,
    pumpedMl: 0,
    breastMinutes: 0,
    wet: 0,
    dirty: 0,
    sleepMinutes: 0,
  };
  const startedInDay = (record: CareRecord) => record.startedAt >= start && record.startedAt < end;
  for (const record of records) {
    const details = detailsOf(record);
    if (record.type === 'sleep') {
      const from = Math.max(record.startedAt.getTime(), start.getTime());
      const to = Math.min((record.endedAt ?? now).getTime(), end.getTime(), now.getTime());
      if (to > from) summary.sleepMinutes += Math.floor((to - from) / MINUTE_MS);
      continue;
    }
    if (!startedInDay(record)) continue;
    if (record.type === 'feeding') {
      summary.feedings += 1;
      if (details.method === 'breast') summary.breastMinutes += durationMinutes(record, now);
      if (details.method === 'formula') summary.formulaMl += Number(details.amountMl);
      if (details.method === 'pumped') summary.pumpedMl += Number(details.amountMl);
    } else if (record.type === 'diaper') {
      if (details.kind === 'wet' || details.kind === 'both') summary.wet += 1;
      if (details.kind === 'dirty' || details.kind === 'both') summary.dirty += 1;
    }
  }
  return summary;
}

/** '수유 7회 (분유 360ml · 모유 85분)' · '기저귀 소변 6 · 대변 2' · '수면 11시간 20분' */
export function describeDaySummary(summary: DaySummary): {
  feeding: string;
  diaper: string;
  sleep: string;
} {
  const amounts = [
    summary.formulaMl > 0 && `분유 ${summary.formulaMl}ml`,
    summary.pumpedMl > 0 && `유축 ${summary.pumpedMl}ml`,
    summary.breastMinutes > 0 && `모유 ${formatDuration(summary.breastMinutes)}`,
  ].filter(Boolean);
  return {
    feeding: `수유 ${summary.feedings}회${amounts.length > 0 ? ` (${amounts.join(' · ')})` : ''}`,
    diaper: `기저귀 소변 ${summary.wet} · 대변 ${summary.dirty}`,
    sleep: `수면 ${formatDuration(summary.sleepMinutes)}`,
  };
}

/** 24시간이 넘게 진행 중이면 끝 시각을 넣어 달라고 표시한다 */
export const STALE_TIMER_MINUTES = 24 * 60;
