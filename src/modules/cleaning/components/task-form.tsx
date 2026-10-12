'use client';

import { useId, useState } from 'react';
import { ChoiceChip } from '@/components/form/choice-chip';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { initialFormState, type FormState } from '@/lib/form-state';
import { isValidLocalDate, type LocalDate } from '@/lib/local-date';
import type { ActiveMember } from '@/modules/core/household/queries';
import type { SpaceItem } from '@/modules/core/space/queries';
import {
  firstDueDate,
  scheduleAfterEdit,
  type Recurrence,
  type RecurrenceType,
} from '@/modules/core/task/recurrence';
import { RecurrenceFields } from './recurrence-fields';

export type TaskFormInitial = {
  /** 수정할 때만 */
  taskId?: string;
  nextDueDate?: LocalDate | null;
  lastCompletedOn?: LocalDate | null;
  title: string;
  spaceId: string | null;
  recurrence: Recurrence;
  startDate: LocalDate;
  assigneeMemberId: string | null;
  estimatedMinutes: number | null;
  note: string | null;
};

type TaskFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: TaskFormInitial;
  spaces: SpaceItem[];
  members: ActiveMember[];
  submitLabel: string;
  /** 가구 시간대의 오늘 (수정 화면 미리보기 계산용) */
  today: LocalDate;
  /** 수정 화면이면 시작일 설명 · 미리보기 계산이 달라진다 */
  editing?: boolean;
};

/** 할 일 등록 · 수정 (docs/modules/cleaning.md 4.3절) */
export function TaskForm({
  action,
  initial,
  spaces,
  members,
  submitLabel,
  today,
  editing = false,
}: TaskFormProps) {
  const ids = { start: useId(), assignee: useId(), minutes: useId(), note: useId() };
  // 반복 고르기 · 시작일은 상태로 관리하므로 제출 후 폼을 초기화하지 않는다
  const [state, formProps, pending] = usePersistentFormAction(action, initialFormState);
  const [type, setType] = useState<RecurrenceType>(initial.recurrence.type);
  const [startDate, setStartDate] = useState(initial.startDate);
  const errors = state.fieldErrors ?? {};
  const value = (field: keyof TaskFormInitial, fallback: string | number | null) =>
    state.values?.[field] ?? (fallback === null ? '' : String(fallback));
  const selectedSpace = value('spaceId', initial.spaceId);

  // 미리보기도 저장할 때와 같은 규칙으로 첫 예정일을 정한다
  const firstDueOf = (rule: Recurrence): LocalDate | null => {
    if (!isValidLocalDate(startDate)) return null;
    if (!editing) return firstDueDate(rule, startDate);
    return scheduleAfterEdit(
      {
        recurrence: initial.recurrence,
        startDate: initial.startDate,
        nextDueDate: initial.nextDueDate ?? null,
      },
      { recurrence: rule, startDate },
      { today, lastCompletedOn: initial.lastCompletedOn ?? null },
    ).nextDueDate;
  };

  return (
    <form {...formProps} noValidate className="flex flex-col gap-6">
      {initial.taskId && <input type="hidden" name="taskId" value={initial.taskId} />}
      <FormMessage state={state} />
      <FieldGroup>
        <TextField
          label="할 일"
          name="title"
          placeholder="예: 화장실 청소"
          maxLength={40}
          defaultValue={value('title', initial.title)}
          error={errors.title}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">공간</legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', name: '없음', icon: null }, ...spaces].map((space) => (
              <ChoiceChip
                key={space.id || 'none'}
                name="spaceId"
                value={space.id}
                defaultChecked={selectedSpace === space.id}
              >
                {space.icon && (
                  <span aria-hidden className="mr-1">
                    {space.icon}
                  </span>
                )}
                {space.name}
              </ChoiceChip>
            ))}
          </div>
          {errors.spaceId && <p className="text-sm text-destructive">{errors.spaceId}</p>}
        </fieldset>

        <RecurrenceFields
          defaultValue={initial.recurrence}
          firstDueOf={firstDueOf}
          errors={errors}
          onTypeChange={setType}
        />

        {type !== 'once' && (
          <Field data-invalid={errors.startDate ? true : undefined}>
            <FieldLabel htmlFor={ids.start}>시작일</FieldLabel>
            <div>
              <Input
                id={ids.start}
                type="date"
                name="startDate"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-invalid={errors.startDate ? true : undefined}
                className="h-10 w-44"
              />
            </div>
            <FieldDescription>
              {editing ? '바꾸면 이 날부터 예정일을 다시 계산해요.' : '이 날부터 반복을 시작해요.'}
            </FieldDescription>
            {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
          </Field>
        )}
        {type === 'once' && <input type="hidden" name="startDate" value={startDate} />}

        <Field>
          <FieldLabel htmlFor={ids.assignee}>담당</FieldLabel>
          <div>
            <NativeSelect
              id={ids.assignee}
              name="assigneeMemberId"
              defaultValue={value('assigneeMemberId', initial.assigneeMemberId)}
              className="w-44"
            >
              <NativeSelectOption value="">누구나</NativeSelectOption>
              {members.map((member) => (
                <NativeSelectOption key={member.id} value={member.id}>
                  {member.displayName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <FieldDescription>담당이 아니어도 누구나 완료할 수 있어요.</FieldDescription>
          {errors.assigneeMemberId && <FieldError>{errors.assigneeMemberId}</FieldError>}
        </Field>

        <Field data-invalid={errors.estimatedMinutes ? true : undefined}>
          <FieldLabel htmlFor={ids.minutes}>걸리는 시간 (선택)</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={ids.minutes}
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              name="estimatedMinutes"
              defaultValue={value('estimatedMinutes', initial.estimatedMinutes)}
              aria-invalid={errors.estimatedMinutes ? true : undefined}
              className="h-10 w-24"
            />
            <span className="text-sm">분</span>
          </div>
          {errors.estimatedMinutes && <FieldError>{errors.estimatedMinutes}</FieldError>}
        </Field>

        <Field data-invalid={errors.note ? true : undefined}>
          <FieldLabel htmlFor={ids.note}>메모 (선택)</FieldLabel>
          <Textarea
            id={ids.note}
            name="note"
            rows={2}
            maxLength={200}
            defaultValue={value('note', initial.note)}
            placeholder="예: 배수구 거름망도 같이"
          />
          {errors.note && <FieldError>{errors.note}</FieldError>}
        </Field>
      </FieldGroup>
      <SubmitButton className="h-11 self-start px-6" pending={pending} pendingLabel="저장하는 중…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
