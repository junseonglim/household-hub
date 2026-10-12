import { and, eq, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { child, growthRecord, milestone } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import type { LocalDate } from '@/lib/local-date';
import { logActivity } from '@/modules/core/activity/log';
import type { MemberContext } from '@/modules/core/member-context';
import type { MeasurementInput, MilestoneInput } from './validators';

// 성장 · 발달 기록 (docs/modules/childcare.md 4.4절). 승인된 구성원 누구나 쓰고 고치고 지운다.

async function getBornChild(tx: Tx, ctx: MemberContext, childId: string) {
  const [found] = await tx
    .select()
    .from(child)
    .where(
      and(eq(child.id, childId), eq(child.householdId, ctx.householdId), isNull(child.archivedAt)),
    )
    .limit(1);
  if (!found) throw new DomainError('NOT_FOUND', '아이 정보를 찾을 수 없어요.');
  if (!found.birthDate)
    throw new DomainError('INVALID', "'태어났어요'를 누른 뒤에 기록할 수 있어요.");
  return found as typeof found & { birthDate: LocalDate };
}

function assertAfterBirth(birthDate: LocalDate, date: LocalDate) {
  if (date < birthDate) throw new DomainError('INVALID', '태어난 날 전으로는 기록할 수 없어요.');
}

export async function addMeasurement(ctx: MemberContext, childId: string, input: MeasurementInput) {
  await db.transaction(async (tx) => {
    const owner = await getBornChild(tx, ctx, childId);
    assertAfterBirth(owner.birthDate, input.measuredOn);
    const [created] = await tx
      .insert(growthRecord)
      .values({
        householdId: ctx.householdId,
        childId: owner.id,
        ...input,
        recordedByMemberId: ctx.memberId,
      })
      .returning({ id: growthRecord.id });
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'childcare',
      action: 'growth.recorded',
      target: { type: 'growth_record', id: created!.id },
      payload: { childName: owner.name, weightKg: input.weightKg, heightCm: input.heightCm },
    });
  });
}

async function getMeasurement(tx: Tx, ctx: MemberContext, recordId: string) {
  const [found] = await tx
    .select({ record: growthRecord, birthDate: child.birthDate })
    .from(growthRecord)
    .innerJoin(child, eq(growthRecord.childId, child.id))
    .where(and(eq(growthRecord.id, recordId), eq(growthRecord.householdId, ctx.householdId)))
    .limit(1);
  if (!found) throw new DomainError('NOT_FOUND', '측정 기록을 찾을 수 없어요.');
  return found;
}

export async function updateMeasurement(
  ctx: MemberContext,
  recordId: string,
  input: MeasurementInput,
) {
  await db.transaction(async (tx) => {
    const { record, birthDate } = await getMeasurement(tx, ctx, recordId);
    if (birthDate) assertAfterBirth(birthDate, input.measuredOn);
    await tx.update(growthRecord).set(input).where(eq(growthRecord.id, record.id));
  });
}

export async function deleteMeasurement(ctx: MemberContext, recordId: string) {
  const deleted = await db
    .delete(growthRecord)
    .where(and(eq(growthRecord.id, recordId), eq(growthRecord.householdId, ctx.householdId)))
    .returning({ id: growthRecord.id });
  if (deleted.length === 0) throw new DomainError('NOT_FOUND', '이미 지운 기록이에요.');
}

export async function addMilestone(ctx: MemberContext, childId: string, input: MilestoneInput) {
  await db.transaction(async (tx) => {
    const owner = await getBornChild(tx, ctx, childId);
    assertAfterBirth(owner.birthDate, input.achievedOn);
    const [created] = await tx
      .insert(milestone)
      .values({
        householdId: ctx.householdId,
        childId: owner.id,
        ...input,
        recordedByMemberId: ctx.memberId,
      })
      .returning({ id: milestone.id });
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'childcare',
      action: 'milestone.added',
      target: { type: 'milestone', id: created!.id },
      payload: { childName: owner.name, title: input.title },
    });
  });
}

export async function updateMilestone(
  ctx: MemberContext,
  milestoneId: string,
  input: MilestoneInput,
) {
  await db.transaction(async (tx) => {
    const [found] = await tx
      .select({ id: milestone.id, birthDate: child.birthDate })
      .from(milestone)
      .innerJoin(child, eq(milestone.childId, child.id))
      .where(and(eq(milestone.id, milestoneId), eq(milestone.householdId, ctx.householdId)))
      .limit(1);
    if (!found) throw new DomainError('NOT_FOUND', '발달 기록을 찾을 수 없어요.');
    if (found.birthDate) assertAfterBirth(found.birthDate, input.achievedOn);
    await tx.update(milestone).set(input).where(eq(milestone.id, found.id));
  });
}

export async function deleteMilestone(ctx: MemberContext, milestoneId: string) {
  const deleted = await db
    .delete(milestone)
    .where(and(eq(milestone.id, milestoneId), eq(milestone.householdId, ctx.householdId)))
    .returning({ id: milestone.id });
  if (deleted.length === 0) throw new DomainError('NOT_FOUND', '이미 지운 기록이에요.');
}
