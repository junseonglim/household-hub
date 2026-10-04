'use client';

import { useActionState, useId, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { initialFormState, type FormState } from '@/lib/form-state';
import { FormMessage } from './form-message';

type ConfirmActionButtonProps<T> = {
  action: (prev: FormState<T>, formData: FormData) => Promise<FormState<T>>;
  /** 함께 보낼 숨은 값 (예: memberId) */
  fields: Record<string, string>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  triggerSize?: 'sm' | 'default';
  /** 결과를 직접 그리고 싶을 때 (예: 임시 비밀번호 표시) */
  renderResult?: (state: FormState<T>) => React.ReactNode;
};

/** 되돌리기 어려운 작업(거절 · 내보내기 · 비밀번호 초기화)을 확인 창을 거쳐 실행하는 버튼 */
export function ConfirmActionButton<T>({
  action,
  fields,
  triggerLabel,
  title,
  description,
  confirmLabel,
  destructive = false,
  triggerSize = 'sm',
  renderResult,
}: ConfirmActionButtonProps<T>) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialFormState as FormState<T>);

  return (
    <>
      {/* 확인 창은 문서 끝에 그려지므로, 확인 버튼이 form 속성으로 이 폼을 제출한다 */}
      <form id={formId} action={formAction} onSubmit={() => setOpen(false)} hidden>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant={destructive ? 'destructive' : 'outline'}
              size={triggerSize}
              disabled={pending}
            />
          }
        >
          {triggerLabel}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form={formId}
              variant={destructive ? 'destructive' : 'default'}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {renderResult ? renderResult(state) : <FormMessage state={state} />}
    </>
  );
}
