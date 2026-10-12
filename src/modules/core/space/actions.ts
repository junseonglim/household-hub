'use server';

import { revalidatePath } from 'next/cache';
import { formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { guardedAction } from '../guarded-action';
import type { MemberContext } from '../member-context';
import { archiveSpace, createSpace, moveSpace, updateSpace } from './service';
import {
  createSpaceSchema,
  moveSpaceSchema,
  spaceTargetSchema,
  updateSpaceSchema,
} from './validators';

// 공간은 여러 모듈 화면(청소 등)에 보이므로 화면 전체를 새로 그린다
const guarded = <T>(run: (ctx: MemberContext) => Promise<FormState<T>>) =>
  guardedAction(run, () => revalidatePath('/', 'layout'));

export async function createSpaceAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = createSpaceSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['name', 'icon']));
    await createSpace(ctx, parsed.data);
    return success(`'${parsed.data.name}' 공간을 추가했어요.`);
  });
}

export async function updateSpaceAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = updateSpaceSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['name', 'icon']));
    await updateSpace(ctx, parsed.data);
    return success('저장했어요.');
  });
}

export async function moveSpaceAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = moveSpaceSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await moveSpace(ctx, parsed.data);
    return success();
  });
}

export async function archiveSpaceAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = spaceTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await archiveSpace(ctx, parsed.data.spaceId);
    return success('공간을 보관했어요.');
  });
}
