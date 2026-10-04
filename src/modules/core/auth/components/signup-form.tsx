'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { FieldGroup } from '@/components/ui/field';
import { initialFormState } from '@/lib/form-state';
import { signUpAction } from '../actions';

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialFormState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <FieldGroup>
        <TextField
          label="이름"
          name="name"
          autoComplete="name"
          placeholder="예: 김엄마"
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
        />
        <TextField
          label="이메일"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <TextField
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="new-password"
          description="8자 이상"
          error={state.fieldErrors?.password}
        />
        <TextField
          label="비밀번호 확인"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          error={state.fieldErrors?.passwordConfirm}
        />
      </FieldGroup>
      <SubmitButton className="h-11 w-full" pendingLabel="가입하는 중…">
        가입하기
      </SubmitButton>
    </form>
  );
}
