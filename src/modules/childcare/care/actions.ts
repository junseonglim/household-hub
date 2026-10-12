'use server';

import { revalidatePath } from 'next/cache';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import { isTimerRecord } from './logic';
import { addCareLog, deleteCareLog, stopTimer, updateCareLog } from './service';
import { addCareSchema, careTargetSchema, childTargetSchema, updateCareSchema } from './validators';

const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/childcare', 'layout'));

/** 오류가 났을 때 되살릴 칸 */
const CARE_FIELDS = ['at', 'endAt', 'note', 'minutes', 'amountMlCustom', 'celsius', 'name', 'dose'];

export type AddedCareLog = { id: string };

export async function addCareLogAction(
  _prev: FormState<AddedCareLog>,
  formData: FormData,
): Promise<FormState<AddedCareLog>> {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = addCareSchema({ timezone: ctx.timezone, now: new Date() }).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, CARE_FIELDS));
    const { childId, input } = parsed.data;
    const { id, summary } = await addCareLog(ctx, childId, input);
    // 모유 직수를 분 없이 넣으면 타이머가 시작된다
    const timerStarted = input.endedAt === null && isTimerRecord(input);
    return success(
      timerStarted ? `${summary}. 다 먹으면 [끝]을 눌러 주세요.` : `${summary} 기록했어요.`,
      { id },
    );
  });
}

/** 😴 재우기: 바로 수면 타이머를 시작한다 */
export async function startSleepAction(
  _prev: FormState<AddedCareLog>,
  formData: FormData,
): Promise<FormState<AddedCareLog>> {
  return guarded(async (ctx) => {
    const parsed = childTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    const { id } = await addCareLog(ctx, parsed.data.childId, {
      type: 'sleep',
      startedAt: new Date(),
      endedAt: null,
      details: {},
      note: null,
    });
    return success('재우기 시작. 깨면 [깼어요]를 눌러 주세요.', { id });
  });
}

export async function stopTimerAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = careTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    const summary = await stopTimer(ctx, parsed.data.logId);
    return success(`${summary} 기록했어요.`);
  });
}

export async function updateCareLogAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateCareSchema({ timezone: ctx.timezone, now: new Date() }).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, CARE_FIELDS));
    await updateCareLog(ctx, parsed.data.logId, parsed.data.input);
    return success('기록을 고쳤어요.');
  });
}

export async function deleteCareLogAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = careTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await deleteCareLog(ctx, parsed.data.logId);
    return success('기록을 지웠어요.');
  });
}
