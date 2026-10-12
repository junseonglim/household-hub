'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import {
  addFromTemplates,
  addPrepItem,
  deletePrepItem,
  togglePrepItem,
  updatePrepItem,
} from './service';
import {
  prepItemSchema,
  prepTargetSchema,
  togglePrepItemSchema,
  updatePrepItemSchema,
} from './validators';

// 육아 화면 전체(오늘의 준비 진행률 포함)를 새로 그린다
const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/childcare', 'layout'));

const ITEM_FIELDS = ['category', 'title', 'quantity', 'note'];

export async function addPrepItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = prepItemSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ITEM_FIELDS));
    await addPrepItem(ctx, parsed.data);
    return success(`${parsed.data.title}을(를) 추가했어요.`);
  });
}

export async function addFromTemplatesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return guarded(async (ctx) => {
    const keys = formData.getAll('items').filter((key) => typeof key === 'string');
    await addFromTemplates(ctx, keys);
    redirect('/childcare/prep');
  });
}

export async function togglePrepItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = togglePrepItemSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await togglePrepItem(ctx, parsed.data);
    return success();
  });
}

export async function updatePrepItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updatePrepItemSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ITEM_FIELDS));
    await updatePrepItem(ctx, parsed.data);
    return success('저장했어요.');
  });
}

export async function deletePrepItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = prepTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await deletePrepItem(ctx, parsed.data.itemId);
    return success('목록에서 지웠어요.');
  });
}
