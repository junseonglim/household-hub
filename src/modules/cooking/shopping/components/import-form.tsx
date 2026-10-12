'use client';

import { useState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { initialFormState } from '@/lib/form-state';
import { importFromMealPlanAction } from '../actions';
import { formatQuantity } from '../parse';
import type { ImportCandidate } from '../queries';

/** 식단 재료 미리보기 → 고른 것만 장보기에 추가 (집에 늘 있는 양념은 기본으로 빼 둔다) */
export function ImportForm({
  from,
  to,
  candidates,
}: {
  from: string;
  to: string;
  candidates: ImportCandidate[];
}) {
  // 체크 상태를 직접 관리하므로 제출 후 폼을 초기화하지 않는다
  const [state, formProps, pending] = usePersistentFormAction(
    importFromMealPlanAction,
    initialFormState,
  );
  const [selected, setSelected] = useState(
    () => new Set(candidates.filter((item) => !item.pantry).map((item) => item.key)),
  );

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <FormMessage state={state} />
      <ul className="divide-y rounded-xl border">
        {candidates.map((item) => (
          <li key={item.key}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                name="keys"
                value={item.key}
                checked={selected.has(item.key)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(item.key);
                  else next.delete(item.key);
                  setSelected(next);
                }}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{item.name}</span>{' '}
                <span>{formatQuantity(item.quantity, item.unit)}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {item.pantry ? '집에 있을 것 같아요 · ' : ''}
                  {item.recipes.join(', ')}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.category}</span>
            </label>
          </li>
        ))}
      </ul>
      <SubmitButton
        className="h-11 self-start px-6"
        disabled={selected.size === 0}
        pending={pending}
        pendingLabel="추가하는 중…"
      >
        장보기에 {selected.size}개 추가
      </SubmitButton>
    </form>
  );
}
