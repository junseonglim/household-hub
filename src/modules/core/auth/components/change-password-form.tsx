'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { FieldGroup } from '@/components/ui/field';
import { initialFormState } from '@/lib/form-state';
import { changePasswordAction } from '../actions';

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialFormState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <FieldGroup>
        <TextField
          label="현재 비밀번호"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          description="임시 비밀번호를 받았다면 그 비밀번호를 넣어 주세요."
          error={state.fieldErrors?.currentPassword}
        />
        <TextField
          label="새 비밀번호"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          description="8자 이상"
          error={state.fieldErrors?.newPassword}
        />
        <TextField
          label="새 비밀번호 확인"
          name="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          error={state.fieldErrors?.newPasswordConfirm}
        />
      </FieldGroup>
      <SubmitButton className="self-start" pendingLabel="바꾸는 중…">
        비밀번호 바꾸기
      </SubmitButton>
    </form>
  );
}
