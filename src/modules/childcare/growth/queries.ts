import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { growthRecord, householdMember, milestone } from '@/db/schema';
import type { LocalDate } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';
import type { GrowthRow } from './growth';

/** 측정 기록 (오래된 것부터 — 늘어난 양 · 그래프 계산 순서) */
export async function listGrowthRecords(ctx: MemberContext, childId: string): Promise<GrowthRow[]> {
  return db
    .select({
      id: growthRecord.id,
      measuredOn: growthRecord.measuredOn,
      weightKg: growthRecord.weightKg,
      heightCm: growthRecord.heightCm,
      headCm: growthRecord.headCm,
      note: growthRecord.note,
    })
    .from(growthRecord)
    .where(and(eq(growthRecord.householdId, ctx.householdId), eq(growthRecord.childId, childId)))
    .orderBy(asc(growthRecord.measuredOn), asc(growthRecord.createdAt));
}

export type MilestoneItem = {
  id: string;
  title: string;
  achievedOn: LocalDate;
  note: string | null;
  recordedByName: string | null;
};

/** 발달 기록 (최근 것부터) */
export async function listMilestones(
  ctx: MemberContext,
  childId: string,
): Promise<MilestoneItem[]> {
  return db
    .select({
      id: milestone.id,
      title: milestone.title,
      achievedOn: milestone.achievedOn,
      note: milestone.note,
      recordedByName: householdMember.displayName,
    })
    .from(milestone)
    .leftJoin(householdMember, eq(milestone.recordedByMemberId, householdMember.id))
    .where(and(eq(milestone.householdId, ctx.householdId), eq(milestone.childId, childId)))
    .orderBy(desc(milestone.achievedOn), desc(milestone.createdAt));
}
