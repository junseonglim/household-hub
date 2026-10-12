'use server';

import { revalidatePath } from 'next/cache';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { todayIn } from '@/lib/local-date';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import {
  addMeasurement,
  addMilestone,
  deleteMeasurement,
  deleteMilestone,
  updateMeasurement,
  updateMilestone,
} from './service';
import {
  addMeasurementSchema,
  addMilestoneSchema,
  measurementTargetSchema,
  milestoneTargetSchema,
  updateMeasurementSchema,
  updateMilestoneSchema,
} from './validators';

const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/childcare', 'layout'));

const MEASUREMENT_FIELDS = ['measuredOn', 'weightKg', 'heightCm', 'headCm', 'note'];
const MILESTONE_FIELDS = ['title', 'achievedOn', 'note'];

export async function addMeasurementAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = addMeasurementSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, MEASUREMENT_FIELDS));
    const { childId, ...input } = parsed.data;
    await addMeasurement(ctx, childId, input);
    return success('측정 기록을 남겼어요.');
  });
}

export async function updateMeasurementAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateMeasurementSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, MEASUREMENT_FIELDS));
    const { recordId, ...input } = parsed.data;
    await updateMeasurement(ctx, recordId, input);
    return success('측정 기록을 고쳤어요.');
  });
}

export async function deleteMeasurementAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = measurementTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await deleteMeasurement(ctx, parsed.data.recordId);
    return success('측정 기록을 지웠어요.');
  });
}

export async function addMilestoneAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = addMilestoneSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, MILESTONE_FIELDS));
    const { childId, ...input } = parsed.data;
    await addMilestone(ctx, childId, input);
    return success(`${input.title} 기록을 남겼어요.`);
  });
}

export async function updateMilestoneAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateMilestoneSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, MILESTONE_FIELDS));
    const { milestoneId, ...input } = parsed.data;
    await updateMilestone(ctx, milestoneId, input);
    return success('발달 기록을 고쳤어요.');
  });
}

export async function deleteMilestoneAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = milestoneTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await deleteMilestone(ctx, parsed.data.milestoneId);
    return success('발달 기록을 지웠어요.');
  });
}
