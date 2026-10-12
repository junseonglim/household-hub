'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initialFormState } from '@/lib/form-state';
import type { LocalDate } from '@/lib/local-date';
import type { SpaceItem } from '@/modules/core/space/queries';
import { describeRecurrence, firstDueDate, type Recurrence } from '@/modules/core/task/recurrence';
import { setupTasksAction } from '../actions';
import { setupFieldPrefix } from '../form-fields';
import type { CleaningTemplate } from '../templates';
import { RecurrenceFields } from './recurrence-fields';

export type SetupItem = CleaningTemplate & {
  /** 이름이 같은 공간 (없으면 '공간 없음') */
  spaceId: string | null;
  /** 같은 제목의 할 일이 이미 있음 → 기본으로 선택하지 않는다 */
  exists: boolean;
};

/** 처음 설정: 추천 할 일을 골라 반복 · 공간을 고친 뒤 한 번에 등록한다 (docs/modules/cleaning.md 4.4절) */
export function SetupForm({
  items,
  spaces,
  today,
}: {
  items: SetupItem[];
  spaces: SpaceItem[];
  today: LocalDate;
}) {
  // 반복 고르기는 상태로 관리하므로 제출 후 폼을 초기화하지 않는다
  const [state, formProps, pending] = usePersistentFormAction(setupTasksAction, initialFormState);

  return (
    <form {...formProps} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <ul className="divide-y rounded-xl border">
        {items.map((item, index) => (
          <SetupRow
            key={item.title}
            item={item}
            prefix={setupFieldPrefix(index)}
            spaces={spaces}
            today={today}
            errors={state.fieldErrors ?? {}}
          />
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        모두 오늘부터 시작해요. 최근에 이미 한 일은 목록에서 완료를 눌러 두면 다음 예정일이
        맞춰져요.
      </p>
      <SubmitButton className="h-11 self-start px-6" pending={pending} pendingLabel="등록하는 중…">
        고른 할 일 등록
      </SubmitButton>
    </form>
  );
}

function SetupRow({
  item,
  prefix,
  spaces,
  today,
  errors,
}: {
  item: SetupItem;
  prefix: string;
  spaces: SpaceItem[];
  today: LocalDate;
  errors: Partial<Record<string, string>>;
}) {
  const ids = { title: useId(), space: useId() };
  const [rule, setRule] = useState<Recurrence | null>(item.recurrence);
  const [spaceId, setSpaceId] = useState(item.spaceId ?? '');
  const space = spaces.find((candidate) => candidate.id === spaceId);
  const hasError = Object.keys(errors).some((field) => field.startsWith(prefix));

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          name={`${prefix}selected`}
          defaultChecked={!item.exists}
          aria-labelledby={ids.title}
          className="mt-1 size-4.5 shrink-0 accent-primary"
        />
        <div className="min-w-0 flex-1">
          <p id={ids.title} className="font-medium">
            {item.title}
            {item.exists && (
              <Badge variant="secondary" className="ml-2 align-middle">
                이미 있음
              </Badge>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {space ? [space.icon, space.name].filter(Boolean).join(' ') : '공간 없음'} ·{' '}
            {rule ? describeRecurrence(rule) : '반복을 골라 주세요'}
          </p>
          {item.hint && <p className="text-sm text-muted-foreground">{item.hint}</p>}
        </div>
      </div>
      <details open={hasError} className="group pl-7.5">
        <summary className="w-fit cursor-pointer list-none text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1">
            반복 · 공간 바꾸기
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={ids.space}>공간</FieldLabel>
            <div>
              <NativeSelect
                id={ids.space}
                name={`${prefix}spaceId`}
                value={spaceId}
                onChange={(event) => setSpaceId(event.target.value)}
                className="w-44"
              >
                <NativeSelectOption value="">공간 없음</NativeSelectOption>
                {spaces.map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {[option.icon, option.name].filter(Boolean).join(' ')}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </Field>
          <RecurrenceFields
            namePrefix={prefix}
            defaultValue={item.recurrence}
            firstDueOf={(rule) => firstDueDate(rule, today)}
            errors={errors}
            onRuleChange={setRule}
          />
        </div>
      </details>
    </li>
  );
}
