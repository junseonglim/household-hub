import { and, eq, isNull, max } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { child, growthRecord } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import type { LocalDate } from '@/lib/local-date';
import { logActivity } from '@/modules/core/activity/log';
import { canAdminister } from '@/modules/core/household/permissions';
import type { MemberContext } from '@/modules/core/member-context';
import { syncStandardSchedule } from '../health/service';
import type { BornInput, RegisterChildInput, UpdateChildInput } from './validators';

// 아이 정보 (docs/modules/childcare.md 4.1절 · 5절). 등록 · 수정 · 보관은 관리자 이상.

function assertCanManageChild(ctx: MemberContext) {
  if (!canAdminister({ id: ctx.memberId, role: ctx.role })) {
    throw new DomainError('FORBIDDEN', '아이 정보는 관리자만 등록하고 고칠 수 있어요.');
  }
}

async function getActiveChild(tx: Tx, ctx: MemberContext, childId: string) {
  const [found] = await tx
    .select()
    .from(child)
    .where(
      and(eq(child.id, childId), eq(child.householdId, ctx.householdId), isNull(child.archivedAt)),
    )
    .limit(1)
    .for('update');
  if (!found) throw new DomainError('NOT_FOUND', '아이 정보를 찾을 수 없어요.');
  return found;
}

/** 출생 몸무게 · 키 → 생후 0일 측정 기록 */
async function recordBirthMeasurement(
  tx: Tx,
  ctx: MemberContext,
  childId: string,
  input: { birthDate: LocalDate; weightKg: number | null; heightCm: number | null },
) {
  if (input.weightKg === null && input.heightCm === null) return;
  await tx.insert(growthRecord).values({
    householdId: ctx.householdId,
    childId,
    measuredOn: input.birthDate,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    note: '출생',
    recordedByMemberId: ctx.memberId,
  });
}

async function logBorn(
  tx: Tx,
  ctx: MemberContext,
  childId: string,
  name: string,
  birthDate: string,
) {
  await logActivity(tx, {
    householdId: ctx.householdId,
    actorMemberId: ctx.memberId,
    module: 'childcare',
    action: 'child.born',
    target: { type: 'child', id: childId },
    payload: { name, birthDate },
  });
}

export async function registerChild(ctx: MemberContext, input: RegisterChildInput) {
  assertCanManageChild(ctx);
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select({ sortOrder: max(child.sortOrder) })
      .from(child)
      .where(eq(child.householdId, ctx.householdId));
    const born = input.stage === 'born';
    const [created] = await tx
      .insert(child)
      .values({
        householdId: ctx.householdId,
        name: input.name,
        dueDate: born ? null : input.dueDate,
        birthDate: born ? input.birthDate : null,
        sex: input.sex,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      })
      .returning();
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'childcare',
      action: 'child.registered',
      target: { type: 'child', id: created!.id },
      payload: { name: input.name, dueDate: created!.dueDate },
    });
    if (born && created!.birthDate) {
      await recordBirthMeasurement(tx, ctx, created!.id, {
        ...input,
        birthDate: created!.birthDate,
      });
      await syncStandardSchedule(tx, ctx, created!);
      await logBorn(tx, ctx, created!.id, input.name, created!.birthDate);
    }
    return created!.id;
  });
}

/** 태어났어요: 생년월일을 넣고 표준 일정(접종 · 검진 · 행정 · 기념일)을 만든다 */
export async function markBorn(ctx: MemberContext, input: BornInput) {
  assertCanManageChild(ctx);
  await db.transaction(async (tx) => {
    const current = await getActiveChild(tx, ctx, input.childId);
    if (current.birthDate) throw new DomainError('CONFLICT', '이미 태어났다고 기록한 아이예요.');
    const [updated] = await tx
      .update(child)
      .set({ name: input.name, birthDate: input.birthDate, sex: input.sex })
      .where(eq(child.id, current.id))
      .returning();
    await recordBirthMeasurement(tx, ctx, current.id, input);
    await syncStandardSchedule(tx, ctx, updated!);
    await logBorn(tx, ctx, current.id, input.name, input.birthDate);
  });
}

/** 생년월일을 고치면 아직 안 한 표준 일정의 날짜를 다시 계산한다 */
export async function updateChild(ctx: MemberContext, input: UpdateChildInput) {
  assertCanManageChild(ctx);
  await db.transaction(async (tx) => {
    const current = await getActiveChild(tx, ctx, input.childId);
    if (!current.birthDate && input.birthDate) {
      throw new DomainError('INVALID', "태어난 날은 '태어났어요'로 넣어 주세요.");
    }
    if (current.birthDate && !input.birthDate) {
      throw new DomainError('INVALID', '태어난 날을 비울 수 없어요.');
    }
    const [updated] = await tx
      .update(child)
      .set({ name: input.name, dueDate: input.dueDate, birthDate: input.birthDate, sex: input.sex })
      .where(eq(child.id, current.id))
      .returning();
    if (updated!.birthDate !== current.birthDate) await syncStandardSchedule(tx, ctx, updated!);
  });
}

/** 보관: 목록에서 사라진다 (기록은 남는다) */
export async function archiveChild(ctx: MemberContext, childId: string) {
  assertCanManageChild(ctx);
  await db.transaction(async (tx) => {
    const current = await getActiveChild(tx, ctx, childId);
    await tx.update(child).set({ archivedAt: new Date() }).where(eq(child.id, current.id));
  });
}
