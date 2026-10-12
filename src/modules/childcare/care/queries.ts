import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { careLog, householdMember } from '@/db/schema';
import type { LocalDate } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';
import type { CareLogType } from '../constants';
import { dayBounds, isTimerRecord, nextBreastSide, type CareRecord } from './logic';

const DAY_MS = 24 * 60 * 60 * 1000;

const recordColumns = {
  id: careLog.id,
  type: careLog.type,
  startedAt: careLog.startedAt,
  endedAt: careLog.endedAt,
  details: careLog.details,
  note: careLog.note,
  recordedByName: householdMember.displayName,
};

const toRecords = (rows: (Omit<CareRecord, 'type'> & { type: string })[]) =>
  rows.map((row) => ({ ...row, type: row.type as CareLogType }));

function selectRecords() {
  return db
    .select(recordColumns)
    .from(careLog)
    .leftJoin(householdMember, eq(careLog.recordedByMemberId, householdMember.id));
}

/**
 * 하루 기록 (최근 것이 위). 자정을 넘긴 수면을 합계에 넣으려고 이틀 전부터 읽는다.
 * 타임라인에는 그날 시작한 기록만 보여 준다 (화면에서 거른다).
 */
export async function listCareForDay(
  ctx: MemberContext,
  childId: string,
  date: LocalDate,
): Promise<CareRecord[]> {
  const { start, end } = dayBounds(date, ctx.timezone);
  const rows = await selectRecords()
    .where(
      and(
        eq(careLog.householdId, ctx.householdId),
        eq(careLog.childId, childId),
        gte(careLog.startedAt, new Date(start.getTime() - 2 * DAY_MS)),
        lt(careLog.startedAt, end),
      ),
    )
    // 같은 분에 넣은 기록은 나중에 넣은 것이 위
    .orderBy(desc(careLog.startedAt), desc(careLog.createdAt));
  return toRecords(rows);
}

export type CareStatus = {
  /** 진행 중인 타이머 (수면 · 직수) */
  running: CareRecord[];
  lastFeeding: CareRecord | null;
  nextSide: ReturnType<typeof nextBreastSide>;
  lastPoop: CareRecord | null;
};

/** 오늘 화면 위쪽: 진행 중 타이머, 마지막 수유 · 다음 쪽, 마지막 대변 */
export async function getCareStatus(ctx: MemberContext, childId: string): Promise<CareStatus> {
  const scope = and(eq(careLog.householdId, ctx.householdId), eq(careLog.childId, childId));
  const latest = (condition: ReturnType<typeof and>) =>
    selectRecords()
      .where(and(scope, condition))
      .orderBy(desc(careLog.startedAt), desc(careLog.createdAt))
      .limit(1);

  const [open, lastFeeding, lastBreast, lastPoop] = await Promise.all([
    selectRecords()
      .where(and(scope, isNull(careLog.endedAt), inArray(careLog.type, ['sleep', 'feeding'])))
      .orderBy(desc(careLog.startedAt)),
    latest(eq(careLog.type, 'feeding')),
    latest(and(eq(careLog.type, 'feeding'), sql`${careLog.details}->>'method' = 'breast'`)),
    latest(and(eq(careLog.type, 'diaper'), sql`${careLog.details}->>'kind' in ('dirty', 'both')`)),
  ]);
  return {
    running: toRecords(open).filter(isTimerRecord),
    lastFeeding: toRecords(lastFeeding)[0] ?? null,
    nextSide: nextBreastSide(toRecords(lastBreast)),
    lastPoop: toRecords(lastPoop)[0] ?? null,
  };
}

/** 약 이름 칩: 최근 60일에 쓴 약 (최근 순, 최대 6개) */
export async function listRecentMedicines(ctx: MemberContext, childId: string): Promise<string[]> {
  const rows = await db
    .select({
      name: sql<string>`${careLog.details}->>'name'`,
      lastAt: sql<Date>`max(${careLog.startedAt})`,
    })
    .from(careLog)
    .where(
      and(
        eq(careLog.householdId, ctx.householdId),
        eq(careLog.childId, childId),
        eq(careLog.type, 'medicine'),
        gte(careLog.startedAt, new Date(Date.now() - 60 * DAY_MS)),
      ),
    )
    .groupBy(sql`${careLog.details}->>'name'`)
    .orderBy(sql`max(${careLog.startedAt}) desc`)
    .limit(6);
  return rows.map((row) => row.name).filter(Boolean);
}
