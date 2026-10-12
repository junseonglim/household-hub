'use server';

import { revalidatePath } from 'next/cache';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { todayIn } from '@/lib/local-date';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import {
  addEvent,
  completeEvents,
  deleteEvent,
  dismissEvents,
  editDoneRecord,
  restoreEvent,
  undoCompletion,
  updateEvent,
} from './service';
import {
  addEventSchema,
  completeEventsSchema,
  editDoneSchema,
  eventTargetSchema,
  eventTargetsSchema,
  updateEventSchema,
} from './validators';

const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/childcare', 'layout'));

const EVENT_FIELDS = ['kind', 'title', 'date', 'time', 'place', 'note'];
const DONE_FIELDS = ['doneOn', 'place', 'note'];
const eventIdsOf = (formData: FormData) =>
  formData.getAll('eventIds').filter((id) => typeof id === 'string');

export async function addEventAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = addEventSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, EVENT_FIELDS));
    await addEvent(ctx, parsed.data);
    return success(`${parsed.data.title} 일정을 넣었어요.`);
  });
}

export async function updateEventAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateEventSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, EVENT_FIELDS));
    await updateEvent(ctx, parsed.data);
    return success('저장했어요.');
  });
}

export async function deleteEventAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = eventTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await deleteEvent(ctx, parsed.data.eventId);
    return success('일정을 지웠어요.');
  });
}

export async function completeEventsAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = completeEventsSchema(todayIn(ctx.timezone)).safeParse({
      ...values,
      eventIds: eventIdsOf(formData),
    });
    if (!parsed.success) return invalidInput(parsed.error, pick(values, DONE_FIELDS));
    const count = await completeEvents(ctx, parsed.data);
    return success(count > 1 ? `${count}개를 했다고 기록했어요.` : '했다고 기록했어요.');
  });
}

export async function editDoneAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = editDoneSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, DONE_FIELDS));
    await editDoneRecord(ctx, parsed.data);
    return success('기록을 고쳤어요.');
  });
}

export async function undoCompletionAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = eventTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await undoCompletion(ctx, parsed.data.eventId);
    return success('완료를 취소했어요.');
  });
}

/** [했어요] 창에서 고른 표준 일정을 해당 없음으로 숨긴다 */
export async function dismissEventsAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = eventTargetsSchema.safeParse({ eventIds: eventIdsOf(formData) });
    if (!parsed.success) return invalidInput(parsed.error);
    const count = await dismissEvents(ctx, parsed.data.eventIds);
    return success(
      `${count > 1 ? `${count}개를 ` : ''}해당 없음으로 숨겼어요. 지난 일정에서 되살릴 수 있어요.`,
    );
  });
}

export async function restoreEventAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = eventTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await restoreEvent(ctx, parsed.data.eventId);
    return success('일정을 되살렸어요.');
  });
}
