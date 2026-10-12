'use client';

import { CopyPlus, X } from 'lucide-react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { initialFormState, type FormState } from '@/lib/form-state';
import type { LocalDate } from '@/lib/local-date';
import { copyPreviousWeekAction, removeEntryAction } from '../actions';

/** 결과를 토스트로 알리는 작은 서버 액션 폼 */
function useToastAction(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  { quietOnSuccess = false } = {},
) {
  return useActionState(async (prev: FormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.ok) toast.error(result.message);
    else if (!quietOnSuccess && result.message) toast(result.message);
    return result;
  }, initialFormState);
}

/** 메뉴 빼기 (×) */
export function RemoveEntryButton({ entryId, title }: { entryId: string; title: string }) {
  const [, formAction, pending] = useToastAction(removeEntryAction, { quietOnSuccess: true });
  return (
    <form action={formAction}>
      <input type="hidden" name="entryId" value={entryId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        aria-label={`${title} 빼기`}
        className="text-muted-foreground"
      >
        <X aria-hidden />
      </Button>
    </form>
  );
}

/** 지난주 복사 (빈 칸에만) */
export function CopyWeekButton({ weekStart }: { weekStart: LocalDate }) {
  const [, formAction, pending] = useToastAction(copyPreviousWeekAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="weekStart" value={weekStart} />
      <Button type="submit" variant="outline" className="h-9" disabled={pending}>
        <CopyPlus aria-hidden />
        {pending ? '복사하는 중…' : '지난주 복사'}
      </Button>
    </form>
  );
}
