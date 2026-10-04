'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { initialFormState } from '@/lib/form-state';
import { renameHouseholdAction } from '../actions';

export function HouseholdNameForm({ name }: { name: string }) {
  const [state, formAction] = useActionState(renameHouseholdAction, initialFormState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <FormMessage state={state} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label="가구 이름"
            name="name"
            defaultValue={state.values?.name ?? name}
            error={state.fieldErrors?.name}
          />
        </div>
        <SubmitButton variant="outline" className="h-10" pendingLabel="저장 중…">
          저장
        </SubmitButton>
      </div>
    </form>
  );
}
