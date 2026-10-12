'use server';

import { revalidatePath } from 'next/cache';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { formatShortDate } from '@/lib/local-date';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import { MEAL_TYPE_LABELS } from '../constants';
import { addEntry, copyPreviousWeek, removeEntry } from './service';
import { addEntrySchema, entryTargetSchema, weekTargetSchema } from './validators';

const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/cooking', 'layout'));

export async function addEntryAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = addEntrySchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['title']));
    await addEntry(ctx, parsed.data);
    const { date, mealType } = parsed.data;
    return success(`${formatShortDate(date)} ${MEAL_TYPE_LABELS[mealType]}에 넣었어요.`);
  });
}

export async function removeEntryAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = entryTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await removeEntry(ctx, parsed.data.entryId);
    return success('메뉴를 뺐어요.');
  });
}

export async function copyPreviousWeekAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = weekTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    const count = await copyPreviousWeek(ctx, parsed.data.weekStart);
    return success(
      count > 0
        ? `지난주 메뉴 ${count}개를 빈 칸에 복사했어요.`
        : '복사할 메뉴가 없어요. 지난주가 비어 있거나, 칸이 이미 다 차 있어요.',
    );
  });
}
