'use client';

import { startTransition, useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';
import { initialFormState, type FormState } from '@/lib/form-state';
import { completeTaskAction, undoCompletionAction, type CompletedTask } from '../actions';

/** 완료 결과 알림. 잘못 눌렀을 때 바로 되돌릴 수 있게 [취소]를 붙인다. */
export function showCompletedToast(state: FormState<CompletedTask>) {
  if (!state.ok || !state.data) {
    toast.error(state.message ?? '완료하지 못했어요. 다시 시도해 주세요.');
    return;
  }
  const { completionId } = state.data;
  toast.success(state.message ?? '완료!', {
    duration: 6000,
    action: { label: '취소', onClick: () => undoCompletion(completionId) },
  });
}

function undoCompletion(completionId: string) {
  startTransition(async () => {
    const formData = new FormData();
    formData.set('completionId', completionId);
    const result = await undoCompletionAction(initialFormState, formData);
    if (result.ok) toast(result.message);
    else toast.error(result.message);
  });
}

/** 한 번 탭으로 완료. 서버 응답 전에 완료된 것처럼 보여 준다. */
export function useQuickComplete(task: { id: string; nextDueDate: string | null }) {
  const [done, setDone] = useOptimistic(false);
  const [pending, startCompleting] = useTransition();

  const complete = () =>
    startCompleting(async () => {
      setDone(true);
      const formData = new FormData();
      formData.set('taskId', task.id);
      formData.set('expectedDueDate', task.nextDueDate ?? '');
      showCompletedToast(await completeTaskAction({ ok: null }, formData));
    });

  return { done, pending, complete };
}
