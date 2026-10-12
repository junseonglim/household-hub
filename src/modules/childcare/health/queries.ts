import { asc, and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { healthEvent, householdMember } from '@/db/schema';
import { localDateTimeOf } from '@/lib/local-date';
import type { MemberContext } from '@/modules/core/member-context';
import type { ScheduleEventLike } from './status';

export type ScheduleEvent = ScheduleEventLike & {
  title: string;
  place: string | null;
  note: string | null;
  /** 예약 시각 'HH:mm' (가구 시간대) */
  time: string | null;
  doneByName: string | null;
};

/** 한 아이의 일정 전부 (날짜순). 표준 일정이 50개 남짓이라 한 번에 읽는다 */
export async function listEvents(ctx: MemberContext, childId: string): Promise<ScheduleEvent[]> {
  const rows = await db
    .select({
      id: healthEvent.id,
      kind: healthEvent.kind,
      title: healthEvent.title,
      standardCode: healthEvent.standardCode,
      dueDate: healthEvent.dueDate,
      dueUntil: healthEvent.dueUntil,
      scheduledAt: healthEvent.scheduledAt,
      place: healthEvent.place,
      note: healthEvent.note,
      doneOn: healthEvent.doneOn,
      dismissedAt: healthEvent.dismissedAt,
      doneByName: householdMember.displayName,
    })
    .from(healthEvent)
    .leftJoin(householdMember, eq(healthEvent.doneByMemberId, householdMember.id))
    .where(and(eq(healthEvent.householdId, ctx.householdId), eq(healthEvent.childId, childId)))
    .orderBy(asc(healthEvent.dueDate), asc(healthEvent.createdAt));
  return rows.map(({ scheduledAt, dismissedAt, ...row }) => ({
    ...row,
    dismissed: dismissedAt !== null,
    time: scheduledAt ? localDateTimeOf(scheduledAt, ctx.timezone).slice(11) : null,
  }));
}
