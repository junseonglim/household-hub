'use server';

import { revalidatePath } from 'next/cache';
import { DomainError } from '@/lib/domain-error';
import { failure, formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { requireMember } from '../auth-context';
import type { MemberContext } from '../member-context';
import {
  approveMember,
  changeMemberRole,
  rejectMember,
  removeMember,
  renameHousehold,
  resetMemberPassword,
  updateProfile,
} from './service';
import {
  approveMemberSchema,
  changeRoleSchema,
  householdNameSchema,
  memberTargetSchema,
  profileSchema,
} from './validators';

/** 업무 규칙 위반(DomainError)은 폼 오류로, 그 외 오류는 그대로 던진다 */
async function guarded<T>(
  run: (ctx: MemberContext) => Promise<FormState<T>>,
): Promise<FormState<T>> {
  const ctx = await requireMember();
  try {
    const result = await run(ctx);
    // 구성원 목록 · 메뉴의 승인 대기 배지 등 화면 전체를 새로 그린다
    revalidatePath('/', 'layout');
    return result;
  } catch (error) {
    if (error instanceof DomainError) return failure<T>(error.message);
    throw error;
  }
}

export async function approveMemberAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = approveMemberSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['displayName']));
    await approveMember(ctx, parsed.data);
    return success(`${parsed.data.displayName}님이 가족이 되었어요.`);
  });
}

export async function rejectMemberAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = memberTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await rejectMember(ctx, parsed.data.memberId);
    return success('가입 요청을 거절했어요.');
  });
}

export async function changeRoleAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = changeRoleSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await changeMemberRole(ctx, parsed.data);
    return success('역할을 바꿨어요.');
  });
}

export async function removeMemberAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const parsed = memberTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    await removeMember(ctx, parsed.data.memberId);
    return success('구성원을 내보냈어요.');
  });
}

export async function resetPasswordAction(
  _prev: FormState<{ tempPassword: string }>,
  formData: FormData,
): Promise<FormState<{ tempPassword: string }>> {
  return guarded(async (ctx) => {
    const parsed = memberTargetSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalidInput(parsed.error);
    const tempPassword = await resetMemberPassword(ctx, parsed.data.memberId);
    return success('임시 비밀번호를 만들었어요.', { tempPassword });
  });
}

export async function renameHouseholdAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = householdNameSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['name']));
    await renameHousehold(ctx, parsed.data.name);
    return success('가구 이름을 바꿨어요.');
  });
}

export async function updateProfileAction(_prev: FormState, formData: FormData) {
  return guarded(async (ctx) => {
    const values = formValues(formData);
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) return invalidInput(parsed.error, pick(values, ['name', 'displayName']));
    await updateProfile(ctx, parsed.data);
    return success('내 정보를 저장했어요.');
  });
}
