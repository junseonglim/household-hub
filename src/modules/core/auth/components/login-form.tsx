'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { FieldGroup } from '@/components/ui/field';
import { initialFormState } from '@/lib/form-state';
import { signInAction } from '../actions';

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, initialFormState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <FieldGroup>
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
          autoComplete="current-password"
          error={state.fieldErrors?.password}
        />
      </FieldGroup>
      <SubmitButton className="h-11 w-full" pendingLabel="로그인하는 중…">
        로그인
      </SubmitButton>
    </form>
  );
}
