'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuickComplete } from './use-complete-task';

/** 상세 화면의 [완료] 버튼 (지금 · 나로 기록) */
export function QuickCompleteButton({
  task,
}: {
  task: { id: string; nextDueDate: string | null };
}) {
  const { done, pending, complete } = useQuickComplete(task);
  return (
    <Button type="button" onClick={complete} disabled={done || pending} className="h-10 px-4">
      <Check aria-hidden />
      {done ? '완료했어요' : '완료'}
    </Button>
  );
}
