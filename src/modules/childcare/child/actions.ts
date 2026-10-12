'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, invalidInput, pick, type FormState } from '@/lib/form-state';
import { todayIn } from '@/lib/local-date';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import { archiveChild, markBorn, registerChild, updateChild } from './service';
import {
  bornSchema,
  childTargetSchema,
  registerChildSchema,
  updateChildSchema,
} from './validators';

const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/childcare', 'layout'));

const CHILD_FIELDS = ['name', 'stage', 'dueDate', 'birthDate', 'sex', 'weightKg', 'heightCm'];
const childHome = (childId: string) => `/childcare?child=${childId}` as Route;

export async function registerChildAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = registerChildSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, CHILD_FIELDS));
    const childId = await registerChild(ctx, parsed.data);
    redirect(childHome(childId));
  });
}

export async function markBornAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = bornSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, CHILD_FIELDS));
    await markBorn(ctx, parsed.data);
    redirect(childHome(parsed.data.childId));
  });
}

export async function updateChildAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateChildSchema(todayIn(ctx.timezone)).safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, CHILD_FIELDS));
    await updateChild(ctx, parsed.data);
    redirect(childHome(parsed.data.childId));
  });
}

export async function archiveChildAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = childTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await archiveChild(ctx, parsed.data.childId);
    redirect('/childcare');
  });
}
