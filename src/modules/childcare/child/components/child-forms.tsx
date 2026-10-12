'use client';

import { useId, useState } from 'react';
import { ChoiceChip } from '@/components/form/choice-chip';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { initialFormState } from '@/lib/form-state';
import type { LocalDate } from '@/lib/local-date';
import { SEX_LABELS, SEXES } from '../../constants';
import { markBornAction, registerChildAction, updateChildAction } from '../actions';
import type { ChildItem } from '../queries';

type Errors = Partial<Record<string, string>>;

// 아이 등록 · 태어났어요 · 정보 고치기 폼 (docs/modules/childcare.md 4.1절).
// 선택 칩이 있어서 제출한 뒤 폼을 초기화하지 않는다.

function DateField({
  label,
  name,
  defaultValue,
  max,
  description,
  error,
}: {
  label: string;
  name: string;
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
          type="date"
          name={name}
          defaultValue={defaultValue}
          max={max}
          aria-invalid={error ? true : undefined}
          className="h-10 w-44"
        />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function SexField({ defaultValue }: { defaultValue: string | null }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">성별 (선택)</legend>
      <div className="flex flex-wrap gap-2">
        <ChoiceChip name="sex" value="" defaultChecked={!defaultValue}>
          아직 몰라요
        </ChoiceChip>
        {SEXES.map((sex) => (
          <ChoiceChip key={sex} name="sex" value={sex} defaultChecked={defaultValue === sex}>
            {SEX_LABELS[sex]}
          </ChoiceChip>
        ))}
      </div>
    </fieldset>
  );
}

function BirthMeasureFields({ errors }: { errors: Errors }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        label="출생 몸무게 kg (선택)"
        name="weightKg"
        inputMode="decimal"
        placeholder="예: 3.25"
        error={errors.weightKg}
      />
      <TextField
        label="출생 키 cm (선택)"
        name="heightCm"
        inputMode="decimal"
        placeholder="예: 50.5"
        error={errors.heightCm}
      />
    </div>
  );
}

/** 처음 등록: 태명 · 예정일 (이미 태어났으면 생년월일) */
export function RegisterChildForm({ today }: { today: LocalDate }) {
  const [stage, setStage] = useState<'expecting' | 'born'>('expecting');
  const [state, formProps, pending] = usePersistentFormAction(
    registerChildAction,
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form {...formProps} noValidate className="flex flex-col gap-5">
      {state.ok === false && <FormMessage state={state} />}
      <FieldGroup>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">지금</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              name="stage"
              value="expecting"
              checked={stage === 'expecting'}
              onChange={() => setStage('expecting')}
            >
              🤰 기다리는 중
            </ChoiceChip>
            <ChoiceChip
              name="stage"
              value="born"
              checked={stage === 'born'}
              onChange={() => setStage('born')}
            >
              👶 이미 태어났어요
            </ChoiceChip>
          </div>
        </fieldset>
        <TextField
          label={stage === 'expecting' ? '태명' : '이름'}
          name="name"
          placeholder={stage === 'expecting' ? '예: 콩이' : '예: 하늘'}
          description={stage === 'expecting' ? '태어나면 이름으로 바꿀 수 있어요.' : undefined}
          maxLength={20}
          error={errors.name}
        />
        {stage === 'expecting' ? (
          <DateField label="출산 예정일" name="dueDate" error={errors.dueDate} />
        ) : (
          <>
            <DateField
              label="태어난 날"
              name="birthDate"
              max={today}
              description="예방접종 · 검진 일정을 이 날짜로 계산해요."
              error={errors.birthDate}
            />
            <BirthMeasureFields errors={errors} />
          </>
        )}
        <SexField defaultValue={null} />
      </FieldGroup>
      <SubmitButton className="h-11 self-start px-6" pending={pending} pendingLabel="등록하는 중…">
        등록
      </SubmitButton>
    </form>
  );
}

/** 태어났어요: 이름 · 생년월일 · 출생 몸무게 · 키 → 표준 일정 생성 */
export function BornForm({ child, today }: { child: ChildItem; today: LocalDate }) {
  const [state, formProps, pending] = usePersistentFormAction(markBornAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form {...formProps} noValidate className="flex flex-col gap-5">
      {state.ok === false && <FormMessage state={state} />}
      <input type="hidden" name="childId" value={child.id} />
      <FieldGroup>
        <TextField
          label="이름"
          name="name"
          defaultValue={child.name}
          description="태명 그대로 두어도 돼요. 나중에 바꿀 수 있어요."
          maxLength={20}
          error={errors.name}
        />
        <DateField
          label="태어난 날"
          name="birthDate"
          defaultValue={today}
          max={today}
          description="예방접종 · 검진 · 출생신고 일정을 이 날짜로 만들어요."
          error={errors.birthDate}
        />
        <BirthMeasureFields errors={errors} />
        <SexField defaultValue={child.sex} />
      </FieldGroup>
      <SubmitButton className="h-11 self-start px-6" pending={pending} pendingLabel="기록하는 중…">
        태어났어요 🎉
      </SubmitButton>
    </form>
  );
}

/** 아이 정보 고치기 (관리자) */
export function EditChildForm({ child, today }: { child: ChildItem; today: LocalDate }) {
  const [state, formProps, pending] = usePersistentFormAction(updateChildAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form {...formProps} noValidate className="flex flex-col gap-5">
      {state.ok === false && <FormMessage state={state} />}
      <input type="hidden" name="childId" value={child.id} />
      <FieldGroup>
        <TextField
          label={child.birthDate ? '이름' : '태명'}
          name="name"
          defaultValue={child.name}
          maxLength={20}
          error={errors.name}
        />
        {child.birthDate ? (
          <DateField
            label="태어난 날"
            name="birthDate"
            defaultValue={child.birthDate}
            max={today}
            description="바꾸면 아직 하지 않은 접종 · 검진 일정의 날짜를 다시 계산해요."
            error={errors.birthDate}
          />
        ) : (
          <DateField
            label="출산 예정일"
            name="dueDate"
            defaultValue={child.dueDate ?? ''}
            error={errors.dueDate}
          />
        )}
        {child.birthDate && child.dueDate && (
          <input type="hidden" name="dueDate" value={child.dueDate} />
        )}
        <SexField defaultValue={child.sex} />
      </FieldGroup>
      <SubmitButton className="h-11 self-start px-6" pending={pending} pendingLabel="저장하는 중…">
        저장
      </SubmitButton>
    </form>
  );
}
