'use client';

import { useEffect, useId, useState, startTransition } from 'react';
import { toast } from 'sonner';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { initialFormState } from '@/lib/form-state';
import { deleteCareLogAction } from '../actions';

// 신생아 기록 폼에서 같이 쓰는 조각

/** 화면을 그린 서버 시각부터 시작해서 30초마다 갱신 (처음 그릴 때 서버와 같은 값이라 hydration이 어긋나지 않는다) */
export function useNow(serverNow: number, intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** `<input type="datetime-local">` (가구 시간대 'YYYY-MM-DDTHH:mm') */
export function TimeField({
  label,
  name = 'at',
  defaultValue,
  max,
  description,
  error,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  max?: string;
  description?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div>
        <Input
          id={id}
          type="datetime-local"
          name={name}
          defaultValue={defaultValue}
          max={max}
          aria-invalid={error ? true : undefined}
          className="h-10 w-56"
        />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

/** 저장 직후 토스트의 [취소]: 방금 기록을 지운다 */
export function toastWithUndo(message: string, logId: string) {
  toast.success(message, {
    action: {
      label: '취소',
      onClick: () =>
        startTransition(async () => {
          const formData = new FormData();
          formData.set('logId', logId);
          const result = await deleteCareLogAction(initialFormState, formData);
          if (result.ok) toast('기록을 취소했어요.');
          else toast.error(result.message);
        }),
    },
  });
}
