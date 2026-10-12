import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { child, healthEvent } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { instantFromLocalDateTime, type LocalDate } from '@/lib/local-date';
import { logActivity } from '@/modules/core/activity/log';
import type { MemberContext } from '@/modules/core/member-context';
import { planStandardSchedule } from './standard-schedule';
import type {
  AddEventInput,
  CompleteEventsInput,
  EditDoneInput,
  EventFields,
  UpdateEventInput,
} from './validators';

// 건강 · 일정 업무 규칙 (docs/modules/childcare.md 5절). 일정은 승인된 구성원 누구나 다룬다.

/**
 * 표준 일정을 생년월일에 맞춘다. '태어났어요' · 생년월일 수정 · 완료 기록이 바뀔 때 부른다.
 * - 없는 일정은 만든다.
 * - 아직 안 했고 [해당 없음]도 아닌 일정은 날짜를 다시 계산한다. 한 일정 · 숨긴 일정은 그대로 둔다.
 */
export async function syncStandardSchedule(
  tx: Tx,
  ctx: MemberContext,
  target: { id: string; birthDate: LocalDate | null },
) {
  if (!target.birthDate) return;
  const existing = await tx
    .select({
      id: healthEvent.id,
      code: healthEvent.standardCode,
      dueDate: healthEvent.dueDate,
      dueUntil: healthEvent.dueUntil,
      doneOn: healthEvent.doneOn,
      dismissedAt: healthEvent.dismissedAt,
    })
    .from(healthEvent)
    .where(and(eq(healthEvent.childId, target.id), isNotNull(healthEvent.standardCode)));
  const byCode = new Map(existing.map((event) => [event.code!, event]));
  const doneOnByCode = new Map(
    existing.flatMap((event) => (event.doneOn ? [[event.code!, event.doneOn] as const] : [])),
  );
  const plan = planStandardSchedule(target.birthDate, doneOnByCode);

  const missing = plan.filter((planned) => !byCode.has(planned.code));
  if (missing.length > 0) {
    await tx
      .insert(healthEvent)
      .values(
        missing.map((planned) => ({
          householdId: ctx.householdId,
          childId: target.id,
          kind: planned.kind,
          title: planned.title,
          standardCode: planned.code,
          dueDate: planned.dueDate,
          dueUntil: planned.dueUntil,
        })),
      )
      .onConflictDoNothing({ target: [healthEvent.childId, healthEvent.standardCode] });
  }
  for (const planned of plan) {
    const current = byCode.get(planned.code);
    if (!current || current.doneOn || current.dismissedAt) continue;
    if (current.dueDate === planned.dueDate && current.dueUntil === planned.dueUntil) continue;
    await tx
      .update(healthEvent)
      .set({ dueDate: planned.dueDate, dueUntil: planned.dueUntil })
      .where(eq(healthEvent.id, current.id));
  }
}

async function getActiveChild(tx: Tx, ctx: MemberContext, childId: string) {
  const [found] = await tx
    .select()
    .from(child)
    .where(
      and(eq(child.id, childId), eq(child.householdId, ctx.householdId), isNull(child.archivedAt)),
    )
    .limit(1);
  if (!found) throw new DomainError('NOT_FOUND', '아이 정보를 찾을 수 없어요.');
  return found;
}

/** 일정 하나와 그 아이 (잠금). 다른 가구 · 보관한 아이의 일정이면 없음 */
async function getEvent(tx: Tx, ctx: MemberContext, eventId: string) {
  const [found] = await tx
    .select({ event: healthEvent, child })
    .from(healthEvent)
    .innerJoin(child, eq(healthEvent.childId, child.id))
    .where(
      and(
        eq(healthEvent.id, eventId),
        eq(healthEvent.householdId, ctx.householdId),
        isNull(child.archivedAt),
      ),
    )
    .limit(1)
    .for('update', { of: healthEvent });
  if (!found) throw new DomainError('NOT_FOUND', '일정을 찾을 수 없어요. 이미 지웠을 수 있어요.');
  return found;
}

const customFields = (ctx: MemberContext, input: EventFields) => ({
  kind: input.kind,
  title: input.title,
  dueDate: input.date,
  dueUntil: null,
  scheduledAt: input.time
    ? instantFromLocalDateTime(`${input.date}T${input.time}`, ctx.timezone)
    : null,
  place: input.place,
  note: input.note,
});

export async function addEvent(ctx: MemberContext, input: AddEventInput) {
  await db.transaction(async (tx) => {
    const target = await getActiveChild(tx, ctx, input.childId);
    await tx.insert(healthEvent).values({
      householdId: ctx.householdId,
      childId: target.id,
      ...customFields(ctx, input),
    });
  });
}

/** 직접 추가한 일정만 고칠 수 있다 (표준 일정은 [했어요] · [해당 없음]만) */
export async function updateEvent(ctx: MemberContext, { eventId, ...input }: UpdateEventInput) {
  await db.transaction(async (tx) => {
    const { event } = await getEvent(tx, ctx, eventId);
    if (event.standardCode) throw new DomainError('INVALID', '표준 일정은 고칠 수 없어요.');
    await tx.update(healthEvent).set(customFields(ctx, input)).where(eq(healthEvent.id, event.id));
  });
}

export async function deleteEvent(ctx: MemberContext, eventId: string) {
  await db.transaction(async (tx) => {
    const { event } = await getEvent(tx, ctx, eventId);
    if (event.standardCode) {
      throw new DomainError('INVALID', '표준 일정은 지울 수 없어요. [해당 없음]으로 숨겨 주세요.');
    }
    await tx.delete(healthEvent).where(eq(healthEvent.id, event.id));
  });
}

/**
 * [했어요]. 같은 아이의 일정 여러 개(같은 날 맞힌 접종)를 한 번에 기록할 수 있다.
 * 다른 가족이 먼저 기록한 일정은 건너뛴다.
 * @returns 기록한 개수
 */
export async function completeEvents(
  ctx: MemberContext,
  { eventIds, doneOn, place, note }: CompleteEventsInput,
): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ event: healthEvent, child })
      .from(healthEvent)
      .innerJoin(child, eq(healthEvent.childId, child.id))
      .where(
        and(
          inArray(healthEvent.id, eventIds),
          eq(healthEvent.householdId, ctx.householdId),
          isNull(child.archivedAt),
        ),
      )
      .for('update', { of: healthEvent });
    if (rows.length === 0) throw new DomainError('NOT_FOUND', '일정을 찾을 수 없어요.');
    const childIds = new Set(rows.map((row) => row.child.id));
    if (childIds.size > 1)
      throw new DomainError('INVALID', '한 아이의 일정만 함께 기록할 수 있어요.');
    const targets = rows.filter((row) => !row.event.doneOn && !row.event.dismissedAt);
    if (targets.length === 0) throw new DomainError('CONFLICT', '이미 기록한 일정이에요.');

    await tx
      .update(healthEvent)
      .set({
        doneOn,
        doneByMemberId: ctx.memberId,
        // 비워 두면 전에 써 둔 장소 · 메모를 지우지 않는다
        ...(place ? { place } : {}),
        ...(note ? { note } : {}),
      })
      .where(
        inArray(
          healthEvent.id,
          targets.map((row) => row.event.id),
        ),
      );
    for (const { event, child: owner } of targets) {
      await logActivity(tx, {
        householdId: ctx.householdId,
        actorMemberId: ctx.memberId,
        module: 'childcare',
        action: 'health_event.done',
        target: { type: 'health_event', id: event.id },
        payload: { childName: owner.name, title: event.title, doneOn },
      });
    }
    await syncStandardSchedule(tx, ctx, targets[0]!.child);
    return targets.length;
  });
}

/** 한 날 · 장소 · 메모 고치기 (기록한 사람은 그대로) */
export async function editDoneRecord(ctx: MemberContext, input: EditDoneInput) {
  await db.transaction(async (tx) => {
    const { event, child: owner } = await getEvent(tx, ctx, input.eventId);
    if (!event.doneOn) throw new DomainError('CONFLICT', '완료가 취소된 일정이에요.');
    await tx
      .update(healthEvent)
      .set({ doneOn: input.doneOn, place: input.place, note: input.note })
      .where(eq(healthEvent.id, event.id));
    await syncStandardSchedule(tx, ctx, owner);
  });
}

/** 완료 취소: 다시 할 일정으로 (장소 · 메모는 남긴다) */
export async function undoCompletion(ctx: MemberContext, eventId: string) {
  await db.transaction(async (tx) => {
    const { event, child: owner } = await getEvent(tx, ctx, eventId);
    if (!event.doneOn) throw new DomainError('CONFLICT', '이미 완료가 취소된 일정이에요.');
    await tx
      .update(healthEvent)
      .set({ doneOn: null, doneByMemberId: null })
      .where(eq(healthEvent.id, event.id));
    await syncStandardSchedule(tx, ctx, owner);
  });
}

/**
 * [해당 없음]: 표준 일정을 숨긴다 (로타릭스를 맞았으면 로타 3차 등). 다시 만들지 않는다.
 * 직접 추가한 일정 · 이미 한 일정은 건너뛴다.
 * @returns 숨긴 개수
 */
export async function dismissEvents(ctx: MemberContext, eventIds: string[]): Promise<number> {
  const dismissed = await db
    .update(healthEvent)
    .set({ dismissedAt: new Date() })
    .where(
      and(
        inArray(healthEvent.id, eventIds),
        eq(healthEvent.householdId, ctx.householdId),
        isNotNull(healthEvent.standardCode),
        isNull(healthEvent.doneOn),
        isNull(healthEvent.dismissedAt),
      ),
    )
    .returning({ id: healthEvent.id });
  if (dismissed.length === 0) {
    throw new DomainError('INVALID', '숨길 수 있는 일정이 없어요. 직접 추가한 일정은 지워 주세요.');
  }
  return dismissed.length;
}

/** 숨긴 표준 일정을 되살린다. 숨긴 동안 생년월일이 바뀌었을 수 있어 날짜를 다시 맞춘다 */
export async function restoreEvent(ctx: MemberContext, eventId: string) {
  await db.transaction(async (tx) => {
    const { event, child: owner } = await getEvent(tx, ctx, eventId);
    if (!event.dismissedAt) return;
    await tx.update(healthEvent).set({ dismissedAt: null }).where(eq(healthEvent.id, event.id));
    await syncStandardSchedule(tx, ctx, owner);
  });
}
