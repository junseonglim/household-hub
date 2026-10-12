import { describe, expect, it } from 'vitest';
import {
  dayBounds,
  describeCareRecord,
  describeDaySummary,
  formatDayTime,
  formatDuration,
  formatElapsed,
  isRunning,
  nextBreastSide,
  summarizeDay,
  type CareRecord,
} from './logic';

const TZ = 'Asia/Seoul';
/** 한국 시각 'MM-DD HH:mm' (2027년) */
const at = (value: string) => new Date(`2027-${value.replace(' ', 'T')}:00+09:00`);

let seq = 0;
const record = (overrides: Partial<CareRecord> & Pick<CareRecord, 'type'>): CareRecord => ({
  id: `r${++seq}`,
  startedAt: at('03-20 10:00'),
  endedAt: null,
  details: {},
  note: null,
  recordedByName: '엄마',
  ...overrides,
});

describe('시간 표시', () => {
  it('걸린 시간 · 지난 시간을 말로 바꾼다', () => {
    expect(formatDuration(45)).toBe('45분');
    expect(formatDuration(120)).toBe('2시간');
    expect(formatDuration(72)).toBe('1시간 12분');
    expect(formatElapsed(at('03-20 10:00'), at('03-20 10:00'))).toBe('방금');
    expect(formatElapsed(at('03-20 10:00'), at('03-20 12:10'))).toBe('2시간 10분 전');
    expect(formatElapsed(at('03-18 10:00'), at('03-20 12:10'))).toBe('2일 전');
  });

  it('오늘 · 어제 · 날짜와 시각', () => {
    expect(formatDayTime(at('03-20 15:22'), TZ, '2027-03-20')).toBe('오늘 오후 3:22');
    expect(formatDayTime(at('03-19 21:40'), TZ, '2027-03-20')).toBe('어제 오후 9:40');
    expect(formatDayTime(at('03-18 09:05'), TZ, '2027-03-20')).toBe('3/18 (목) 오전 9:05');
  });
});

describe('기록 한 줄', () => {
  const now = at('03-20 12:00');

  it('종류별로 줄여 쓴다', () => {
    expect(
      describeCareRecord(
        record({ type: 'feeding', details: { method: 'formula', amountMl: 120 } }),
        now,
      ),
    ).toBe('분유 120ml');
    expect(
      describeCareRecord(
        record({
          type: 'feeding',
          details: { method: 'breast', side: 'left' },
          endedAt: at('03-20 10:15'),
        }),
        now,
      ),
    ).toBe('모유 왼쪽 15분');
    expect(describeCareRecord(record({ type: 'diaper', details: { kind: 'both' } }), now)).toBe(
      '소변 · 대변',
    );
    expect(describeCareRecord(record({ type: 'temperature', details: { celsius: 38 } }), now)).toBe(
      '체온 38.0℃',
    );
    expect(
      describeCareRecord(
        record({ type: 'medicine', details: { name: '해열제', dose: '2.5ml' } }),
        now,
      ),
    ).toBe('약 · 해열제 · 2.5ml');
  });

  it('끝 시각이 없는 수면 · 직수는 진행 중', () => {
    const sleeping = record({ type: 'sleep' });
    expect(isRunning(sleeping)).toBe(true);
    expect(describeCareRecord(sleeping, now)).toBe('수면 · 자는 중');
    // 분유는 끝 시각이 없어도 타이머가 아니다
    expect(
      isRunning(record({ type: 'feeding', details: { method: 'formula', amountMl: 80 } })),
    ).toBe(false);
  });
});

describe('다음에 먹일 쪽', () => {
  it('마지막 직수의 반대쪽, 양쪽이었으면 알 수 없다', () => {
    const left = record({ type: 'feeding', details: { method: 'breast', side: 'left' } });
    const right = record({ type: 'feeding', details: { method: 'breast', side: 'right' } });
    const both = record({ type: 'feeding', details: { method: 'breast', side: 'both' } });
    const formula = record({ type: 'feeding', details: { method: 'formula', amountMl: 100 } });
    expect(nextBreastSide([formula, left, right])).toBe('right');
    expect(nextBreastSide([right])).toBe('left');
    expect(nextBreastSide([both, left])).toBeNull();
    expect(nextBreastSide([formula])).toBeNull();
  });
});

describe('하루 합계', () => {
  const day = dayBounds('2027-03-20', TZ);

  it('하루의 경계는 가구 시간대 0시', () => {
    expect(day.start.toISOString()).toBe('2027-03-19T15:00:00.000Z');
    expect(day.end.toISOString()).toBe('2027-03-20T15:00:00.000Z');
  });

  it('수유 횟수 · 양 · 직수 시간, 기저귀 소변 · 대변을 센다', () => {
    const records = [
      record({ type: 'feeding', details: { method: 'formula', amountMl: 120 } }),
      record({ type: 'feeding', details: { method: 'formula', amountMl: 100 } }),
      record({ type: 'feeding', details: { method: 'pumped', amountMl: 60 } }),
      record({
        type: 'feeding',
        details: { method: 'breast', side: 'left' },
        startedAt: at('03-20 08:00'),
        endedAt: at('03-20 08:20'),
      }),
      record({ type: 'diaper', details: { kind: 'wet' } }),
      record({ type: 'diaper', details: { kind: 'both' } }),
      // 전날 기록은 세지 않는다
      record({ type: 'diaper', details: { kind: 'dirty' }, startedAt: at('03-19 23:50') }),
    ];
    const summary = summarizeDay(records, { ...day, now: at('03-20 12:00') });
    expect(summary).toMatchObject({
      feedings: 4,
      formulaMl: 220,
      pumpedMl: 60,
      breastMinutes: 20,
      wet: 2,
      dirty: 1,
    });
    expect(describeDaySummary(summary)).toEqual({
      feeding: '수유 4회 (분유 220ml · 유축 60ml · 모유 20분)',
      diaper: '기저귀 소변 2 · 대변 1',
      sleep: '수면 0분',
    });
  });

  it('수면은 자정을 넘으면 그날에 걸친 시간만, 진행 중이면 지금까지 더한다', () => {
    const records = [
      // 전날 22:00 ~ 오늘 02:30 → 오늘 몫은 2시간 30분
      record({ type: 'sleep', startedAt: at('03-19 22:00'), endedAt: at('03-20 02:30') }),
      // 오늘 23:00부터 자는 중, 지금은 다음 날 01:00 → 오늘 몫은 1시간
      record({ type: 'sleep', startedAt: at('03-20 23:00') }),
    ];
    const summary = summarizeDay(records, { ...day, now: at('03-21 01:00') });
    expect(summary.sleepMinutes).toBe(210);
    // 아직 오늘이면 지금까지만
    const midday = summarizeDay([record({ type: 'sleep', startedAt: at('03-20 13:00') })], {
      ...day,
      now: at('03-20 14:10'),
    });
    expect(midday.sleepMinutes).toBe(70);
  });
});
