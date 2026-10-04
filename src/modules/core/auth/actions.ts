'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { failure, formValues, invalidInput, pick, success, type FormState } from '@/lib/form-state';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { getSession, requireMember } from '../auth-context';
import {
  clearMustChangePassword,
  ensureMembership,
  mustChangePassword,
} from '../household/service';
import { authErrorMessage } from './errors';
import { revokeOtherSessions } from './service';
import { changePasswordSchema, signInSchema, signUpSchema } from './validators';

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const keep = pick(values, ['name', 'email']);
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return invalidInput(parsed.error, keep);

  const { name, email, password } = parsed.data;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
    // 첫 가입자면 가구의 owner, 아니면 승인 대기 구성원이 된다
    await ensureMembership(result.user);
  } catch (error) {
    const message = authErrorMessage(error);
    if (!message) throw error;
    return failure(message, { values: keep });
  }
  redirect('/');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const keep = pick(values, ['email']);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return invalidInput(parsed.error, keep);

  let userId: string;
  try {
    const result = await auth.api.signInEmail({
      body: { ...parsed.data, rememberMe: true },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    const message = authErrorMessage(error);
    if (!message) throw error;
    return failure(message, { values: keep });
  }

  // 임시 비밀번호로 로그인했으면 비밀번호 변경 화면으로 안내한다
  if (await mustChangePassword(userId)) redirect('/settings/profile');
  redirect(safeRedirectPath(values.next) as Route);
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect('/login');
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireMember();
  const parsed = changePasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
      headers: await headers(),
    });
  } catch (error) {
    const message = authErrorMessage(error);
    if (!message) throw error;
    return failure(message, {
      fieldErrors: message.startsWith('현재') ? { currentPassword: message } : undefined,
    });
  }

  const current = await getSession();
  if (current) await revokeOtherSessions(ctx.userId, current.session.token);
  await clearMustChangePassword(ctx);
  revalidatePath('/', 'layout');
  return success('비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요.');
}
