'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { guardedAction } from '@/modules/core/guarded-action';
import type { MemberContext } from '@/modules/core/member-context';
import { formatQuantity } from './parse';
import {
  addItems,
  clearChecked,
  deleteItem,
  importFromMealPlan,
  toggleItem,
  updateItem,
} from './service';
import {
  importRangeSchema,
  itemTargetSchema,
  quickAddSchema,
  toggleItemSchema,
  updateItemSchema,
} from './validators';

const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/cooking', 'layout'));

export async function quickAddAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = quickAddSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['text']));
    const item = parsed.data.text;
    const { merged } = await addItems(ctx, [item], 'manual');
    const label = [item.name, formatQuantity(item.quantity, item.unit)].filter(Boolean).join(' ');
    return success(merged > 0 ? `이미 있던 ${item.name}에 더했어요.` : `${label} 추가했어요.`);
  });
}

export async function toggleItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = toggleItemSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await toggleItem(ctx, parsed.data);
    return success();
  });
}

export async function updateItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateItemSchema.safeParse(values);
    if (!parsed.success) {
      return invalidInput(parsed.error, pick(values, ['name', 'quantity', 'unit', 'note']));
    }
    await updateItem(ctx, parsed.data);
    return success('저장했어요.');
  });
}

export async function deleteItemAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = itemTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await deleteItem(ctx, parsed.data.itemId);
    return success('목록에서 지웠어요.');
  });
}

export async function clearCheckedAction() {
  return guarded(async (ctx) => {
    const count = await clearChecked(ctx);
    return success(count > 0 ? `산 것 ${count}개를 정리했어요.` : '정리할 항목이 없어요.');
  });
}

export async function importFromMealPlanAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = importRangeSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    const keys = formData.getAll('keys').filter((key) => typeof key === 'string');
    await importFromMealPlan(ctx, parsed.data, keys);
    redirect('/cooking/shopping');
  });
}
