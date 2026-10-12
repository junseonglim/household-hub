import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { careLog, child } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { localDateOf } from '@/lib/local-date';
import { logActivity } from '@/modules/core/activity/log';
import type { MemberContext } from '@/modules/core/member-context';
import { describeCareRecord, isTimerRecord } from './logic';
import type { CareInput } from './validators';

// 신생아 기록 업무 규칙 (docs/modules/childcare.md 5절). 승인된 구성원 누구나 쓰고 고치고 지운다.

const RUNNING_MESSAGE = {
  sleep: '이미 자는 중이에요. 진행 중인 수면을 먼저 끝내 주세요.',
  feeding: '이미 모유를 먹는 중이에요. 진행 중인 수유를 먼저 끝내 주세요.',
} as const;

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
  return found;
}

function assertAfterBirth(ctx: MemberContext, birthDate: string, input: CareInput) {
  if (localDateOf(input.startedAt, ctx.timezone) < birthDate) {
    throw new DomainError('INVALID', '태어나기 전 시각이에요. 시각을 확인해 주세요.');
  }
}

/** 같은 아이 · 같은 종류의 진행 중 타이머가 이미 있는지 (exceptId: 고치는 기록 자신) */
async function assertNoRunningTimer(tx: Tx, childId: string, input: CareInput, exceptId?: string) {
  if (input.endedAt !== null || !isTimerRecord(input)) return;
  const running = await tx
    .select({ id: careLog.id })
    .from(careLog)
    .where(
      and(
        eq(careLog.childId, childId),
        eq(careLog.type, input.type),
        isNull(careLog.endedAt),
        input.type === 'feeding' ? sql`${careLog.details}->>'method' = 'breast'` : undefined,
        exceptId ? ne(careLog.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (running.length > 0) {
    throw new DomainError('CONFLICT', RUNNING_MESSAGE[input.type as 'sleep' | 'feeding']);
  }
}

/** 진행 중 타이머 unique index에 걸리면 (동시에 두 사람이 시작) 같은 안내로 바꾼다 */
function isRunningTimerConflict(error: unknown) {
  const cause = (error as { cause?: { code?: string; constraint?: string } })?.cause ?? error;
  return (
    (cause as { code?: string }).code === '23505' &&
    (cause as { constraint?: string }).constraint === 'care_log_running_timer_unique'
  );
}

async function withTimerConflict<T>(input: CareInput, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isRunningTimerConflict(error)) {
      throw new DomainError('CONFLICT', RUNNING_MESSAGE[input.type as 'sleep' | 'feeding']);
    }
    throw error;
  }
}

/** @returns 새 기록 id와 한 줄 요약 ('분유 120ml') */
export async function addCareLog(
  ctx: MemberContext,
  childId: string,
  input: CareInput,
): Promise<{ id: string; summary: string }> {
  return withTimerConflict(input, () =>
    db.transaction(async (tx) => {
      const owner = await getBornChild(tx, ctx, childId);
      assertAfterBirth(ctx, owner.birthDate!, input);
      await assertNoRunningTimer(tx, owner.id, input);
      const [created] = await tx
        .insert(careLog)
        .values({
          householdId: ctx.householdId,
          childId: owner.id,
          type: input.type,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          details: input.details,
          note: input.note,
          recordedByMemberId: ctx.memberId,
        })
        .returning({ id: careLog.id });
      const summary = describeCareRecord(
        { ...input, id: created!.id, recordedByName: null },
        new Date(),
      );
      await logActivity(tx, {
        householdId: ctx.householdId,
        actorMemberId: ctx.memberId,
        module: 'childcare',
        action: 'care_log.added',
        target: { type: 'care_log', id: created!.id },
        payload: { childName: owner.name, type: input.type, summary },
      });
      return { id: created!.id, summary };
    }),
  );
}

async function getCareLog(tx: Tx, ctx: MemberContext, logId: string) {
  const [found] = await tx
    .select({ log: careLog, child })
    .from(careLog)
    .innerJoin(child, eq(careLog.childId, child.id))
    .where(and(eq(careLog.id, logId), eq(careLog.householdId, ctx.householdId)))
    .limit(1)
    .for('update', { of: careLog });
  if (!found) throw new DomainError('NOT_FOUND', '기록을 찾을 수 없어요. 이미 지웠을 수 있어요.');
  return found;
}

/** [깼어요] · [끝]: 진행 중인 타이머를 지금 끝낸다 */
export async function stopTimer(ctx: MemberContext, logId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const { log } = await getCareLog(tx, ctx, logId);
    if (log.endedAt || !isTimerRecord(log)) {
      throw new DomainError('CONFLICT', '이미 끝난 기록이에요.');
    }
    const now = new Date();
    const endedAt = now > log.startedAt ? now : log.startedAt;
    await tx.update(careLog).set({ endedAt }).where(eq(careLog.id, log.id));
    return describeCareRecord(
      { ...log, type: log.type as CareInput['type'], endedAt, recordedByName: null },
      now,
    );
  });
}

/** 기록 고치기. 종류(수유 · 기저귀 …)는 바꿀 수 없다 */
export async function updateCareLog(ctx: MemberContext, logId: string, input: CareInput) {
  await withTimerConflict(input, () =>
    db.transaction(async (tx) => {
      const { log, child: owner } = await getCareLog(tx, ctx, logId);
      if (log.type !== input.type) throw new DomainError('INVALID', '기록 종류는 바꿀 수 없어요.');
      if (owner.birthDate) assertAfterBirth(ctx, owner.birthDate, input);
      await assertNoRunningTimer(tx, owner.id, input, log.id);
      await tx
        .update(careLog)
        .set({
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          details: input.details,
          note: input.note,
        })
        .where(eq(careLog.id, log.id));
    }),
  );
}

/** 지우면 실제로 지운다 (저장 직후 [취소]도 이걸 쓴다) */
export async function deleteCareLog(ctx: MemberContext, logId: string) {
  const deleted = await db
    .delete(careLog)
    .where(and(eq(careLog.id, logId), eq(careLog.householdId, ctx.householdId)))
    .returning({ id: careLog.id });
  if (deleted.length === 0) throw new DomainError('NOT_FOUND', '이미 지운 기록이에요.');
}
