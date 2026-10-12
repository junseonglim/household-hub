'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { Badge } from '@/components/ui/badge';
import { initialFormState } from '@/lib/form-state';
import { PREP_CATEGORIES } from '../../constants';
import { addFromTemplatesAction } from '../actions';
import { templateKey, type PrepTemplate } from '../templates';

export type PrepSetupItem = PrepTemplate & {
  /** 같은 이름의 항목이 이미 있음 → 고를 수 없다 */
  exists: boolean;
};

/** 추천 준비물 고르기: 카테고리별 체크 → 한 번에 등록 (docs/modules/childcare.md 7절) */
export function PrepSetupForm({ items }: { items: PrepSetupItem[] }) {
  const [state, formAction] = useActionState(addFromTemplatesAction, initialFormState);
  const groups = PREP_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormMessage state={state} />
      {groups.map((group) => (
        <fieldset key={group.category}>
          <legend className="mb-2 text-sm font-semibold text-muted-foreground">
            {group.category}
          </legend>
          <ul className="divide-y rounded-xl border">
            {group.items.map((item) => (
              <li key={item.title}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 has-disabled:cursor-default">
                  <input
                    type="checkbox"
                    name="items"
                    value={templateKey(item)}
                    defaultChecked={!item.exists}
                    disabled={item.exists}
                    className="size-4.5 shrink-0 accent-primary"
                  />
                  <span className="flex-1">
                    {item.title}
                    {item.quantity && (
                      <span className="text-sm text-muted-foreground"> {item.quantity}</span>
                    )}
                  </span>
                  {item.exists && <Badge variant="secondary">이미 있음</Badge>}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      <SubmitButton className="h-11 self-start px-6" pendingLabel="등록하는 중…">
        고른 준비물 등록
      </SubmitButton>
    </form>
  );
}
