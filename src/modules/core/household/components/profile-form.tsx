'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { Field, FieldGroup, FieldTitle } from '@/components/ui/field';
import { initialFormState } from '@/lib/form-state';
import { updateProfileAction } from '../actions';
import { ColorPicker } from './color-picker';

export function ProfileForm({
  name,
  displayName,
  color,
}: {
  name: string;
  displayName: string;
  color: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialFormState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <FieldGroup>
        <TextField
          label="이름"
          name="name"
          autoComplete="name"
          defaultValue={state.values?.name ?? name}
          error={state.fieldErrors?.name}
        />
        <TextField
          label="호칭"
          name="displayName"
          description="가족끼리 부르는 이름이에요. 담당자 표시에 쓰여요. (예: 엄마, 아빠)"
          defaultValue={state.values?.displayName ?? displayName}
          error={state.fieldErrors?.displayName}
        />
        <Field>
          <FieldTitle>내 색</FieldTitle>
          <ColorPicker defaultValue={color} label="내 색" />
        </Field>
      </FieldGroup>
      <SubmitButton className="self-start" pendingLabel="저장하는 중…">
        저장
      </SubmitButton>
    </form>
  );
}
