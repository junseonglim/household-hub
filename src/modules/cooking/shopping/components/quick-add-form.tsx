'use client';

import { Plus } from 'lucide-react';
import { useActionState, useRef } from 'react';
import { toast } from 'sonner';
import { SubmitButton } from '@/components/form/submit-button';
import { Input } from '@/components/ui/input';
import { initialFormState, type FormState } from '@/lib/form-state';
import { quickAddAction } from '../actions';

/** 빠른 추가: '양파 2개'처럼 쓰면 이름 · 수량 · 단위로 나눠 저장한다 */
export function QuickAddForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await quickAddAction(prev, formData);
    if (result.ok) toast.success(result.message);
    // 연달아 입력할 수 있게 칸에 다시 커서를 둔다 (성공하면 칸은 비워진다)
    inputRef.current?.focus();
    return result;
  }, initialFormState);
  const error = state.ok === false ? (state.fieldErrors?.text ?? state.message) : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          name="text"
          aria-label="살 것"
          placeholder="무엇을 살까요? (예: 양파 2개)"
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
          defaultValue={state.ok === false ? state.values?.text : undefined}
          aria-invalid={error ? true : undefined}
          className="h-11"
        />
        <SubmitButton className="h-11 px-4" pendingLabel="추가 중…">
          <Plus aria-hidden />
          추가
        </SubmitButton>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
