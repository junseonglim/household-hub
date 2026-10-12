'use client';

import { useActionState, useId, useState } from 'react';
import { toast } from 'sonner';
import { ChoiceChip } from '@/components/form/choice-chip';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { FormState } from '@/lib/form-state';
import { localDateTimeOf } from '@/lib/local-date';
import {
  AMOUNT_PRESETS,
  BREAST_SIDE_LABELS,
  BREAST_SIDES,
  CARE_LOG_ICONS,
  CARE_LOG_LABELS,
  DIAPER_KIND_LABELS,
  DIAPER_KINDS,
  FEEDING_METHOD_LABELS,
  FEEDING_METHODS,
  type BreastSide,
  type CareLogType,
  type FeedingMethod,
} from '../../constants';
import { addCareLogAction, startSleepAction, type AddedCareLog } from '../actions';
import { TimeField, toastWithUndo } from './care-fields';

type EntryProps = {
  childId: string;
  timezone: string;
  /** 다음에 먹일 쪽 (모유 기본값) */
  nextSide: BreastSide | null;
  /** 마지막 수유 방법 (수유 창 기본값) */
  lastMethod: FeedingMethod | null;
  recentMedicines: string[];
};

type DialogType = Exclude<CareLogType, 'sleep'>;
const INITIAL_STATE: FormState<AddedCareLog> = { ok: null };
const BUTTONS: { type: CareLogType; label: string }[] = [
  { type: 'feeding', label: '수유' },
  { type: 'diaper', label: '기저귀' },
  { type: 'sleep', label: '재우기' },
  { type: 'temperature', label: '체온' },
  { type: 'medicine', label: '약' },
];

/**
 * 오늘 화면의 기록 버튼 (docs/modules/childcare.md 4.2절 '입력 방식').
 * 휴대폰 한 손으로 몇 초 안에: 재우기는 바로 타이머, 기저귀는 탭 두 번, 분유는 양 칩 한 번.
 */
export function CareQuickActions(props: EntryProps) {
  const [openType, setOpenType] = useState<DialogType | null>(null);
  const [defaultAt, setDefaultAt] = useState('');
  const [, sleepAction, sleepPending] = useActionState(
    async (prev: FormState<AddedCareLog>, formData: FormData) => {
      const result = await startSleepAction(prev, formData);
      if (result.ok && result.data) toastWithUndo(result.message!, result.data.id);
      else if (!result.ok) toast.error(result.message);
      return result;
    },
    INITIAL_STATE,
  );

  const open = (type: DialogType) => {
    // 창을 열 때마다 '지금'을 기본값으로
    setDefaultAt(localDateTimeOf(new Date(), props.timezone));
    setOpenType(type);
  };

  return (
    <>
      <section aria-label="기록하기" className="grid grid-cols-5 gap-2">
        {BUTTONS.map(({ type, label }) =>
          type === 'sleep' ? (
            <form key={type} action={sleepAction}>
              <input type="hidden" name="childId" value={props.childId} />
              <QuickButton type={type} label={label} submit disabled={sleepPending} />
            </form>
          ) : (
            <QuickButton key={type} type={type} label={label} onClick={() => open(type)} />
          ),
        )}
      </section>
      <Dialog open={openType !== null} onOpenChange={(next) => !next && setOpenType(null)}>
        <DialogContent>
          {openType && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {CARE_LOG_ICONS[openType]} {CARE_LOG_LABELS[openType]} 기록
                </DialogTitle>
              </DialogHeader>
              <CareAddForm
                key={openType}
                type={openType}
                defaultAt={defaultAt}
                onDone={() => setOpenType(null)}
                {...props}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function QuickButton({
  type,
  label,
  submit = false,
  disabled,
  onClick,
}: {
  type: CareLogType;
  label: string;
  submit?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type={submit ? 'submit' : 'button'}
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="flex h-16 w-full flex-col gap-0.5 px-1 text-xs"
    >
      <span aria-hidden className="text-xl leading-none">
        {CARE_LOG_ICONS[type]}
      </span>
      {label}
    </Button>
  );
}

function CareAddForm({
  type,
  defaultAt,
  onDone,
  childId,
  nextSide,
  lastMethod,
  recentMedicines,
}: EntryProps & { type: DialogType; defaultAt: string; onDone: () => void }) {
  const [state, formProps, pending] = usePersistentFormAction(
    async (prev: FormState<AddedCareLog>, formData: FormData) => {
      const result = await addCareLogAction(prev, formData);
      if (result.ok && result.data) {
        toastWithUndo(result.message!, result.data.id);
        onDone();
      }
      return result;
    },
    INITIAL_STATE,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form {...formProps} noValidate className="flex flex-col gap-4">
      {state.ok === false && <FormMessage state={state} />}
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="type" value={type} />
      {type === 'feeding' && (
        <FeedingFields
          defaultAt={defaultAt}
          nextSide={nextSide}
          lastMethod={lastMethod}
          errors={errors}
          pending={pending}
        />
      )}
      {type === 'diaper' && (
        <DiaperFields defaultAt={defaultAt} errors={errors} pending={pending} />
      )}
      {type === 'temperature' && (
        <>
          <FieldGroup>
            <TextField
              label="체온 (℃)"
              name="celsius"
              inputMode="decimal"
              placeholder="예: 37.5"
              autoFocus
              error={errors.celsius}
            />
            <TimeField label="잰 시각" defaultValue={defaultAt} max={defaultAt} error={errors.at} />
          </FieldGroup>
          <SaveFooter pending={pending} />
        </>
      )}
      {type === 'medicine' && (
        <MedicineFields
          defaultAt={defaultAt}
          recentMedicines={recentMedicines}
          errors={errors}
          pending={pending}
        />
      )}
    </form>
  );
}

type Errors = Partial<Record<string, string>>;

function SaveFooter({ pending, label = '저장' }: { pending: boolean; label?: string }) {
  return (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
      <SubmitButton pending={pending} pendingLabel="저장하는 중…">
        {label}
      </SubmitButton>
    </DialogFooter>
  );
}

/** 모유: 쪽 + 타이머 시작 또는 몇 분 / 유축 · 분유: 양 칩 한 번에 저장 */
function FeedingFields({
  defaultAt,
  nextSide,
  lastMethod,
  errors,
  pending,
}: {
  defaultAt: string;
  nextSide: BreastSide | null;
  lastMethod: FeedingMethod | null;
  errors: Errors;
  pending: boolean;
}) {
  const customId = useId();
  const [method, setMethod] = useState<FeedingMethod>(lastMethod ?? 'formula');
  const [side, setSide] = useState<BreastSide>(nextSide ?? 'left');
  const [minutes, setMinutes] = useState('');

  return (
    <>
      <FieldGroup>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">방법</legend>
          <div className="flex flex-wrap gap-2">
            {FEEDING_METHODS.map((option) => (
              <ChoiceChip
                key={option}
                name="method"
                value={option}
                checked={method === option}
                onChange={() => setMethod(option)}
              >
                {FEEDING_METHOD_LABELS[option]}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
        {method === 'breast' ? (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">쪽</legend>
              <div className="flex flex-wrap gap-2">
                {BREAST_SIDES.map((option) => (
                  <ChoiceChip
                    key={option}
                    name="side"
                    value={option}
                    checked={side === option}
                    onChange={() => setSide(option)}
                  >
                    {BREAST_SIDE_LABELS[option]}
                  </ChoiceChip>
                ))}
              </div>
              {nextSide && (
                <p className="text-sm text-muted-foreground">
                  다음은 {BREAST_SIDE_LABELS[nextSide]} 차례예요.
                </p>
              )}
              {errors.side && <FieldError>{errors.side}</FieldError>}
            </fieldset>
            <TextField
              label="몇 분 먹였어요? (선택)"
              name="minutes"
              inputMode="numeric"
              placeholder="예: 15"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              description="비워 두면 지금부터 타이머로 재요."
              error={errors.minutes}
            />
            <TimeField
              label={minutes ? '끝난 시각' : '시작 시각'}
              defaultValue={defaultAt}
              max={defaultAt}
              error={errors.at}
            />
          </>
        ) : (
          <>
            <TimeField
              label="먹인 시각"
              defaultValue={defaultAt}
              max={defaultAt}
              error={errors.at}
            />
            <Field data-invalid={errors.amountMlCustom ? true : undefined}>
              <FieldLabel htmlFor={customId}>양 (ml)</FieldLabel>
              {/* Enter로 제출하면 첫 번째 제출 버튼이 쓰이므로 직접 입력의 [저장]을 칩보다 먼저 둔다 */}
              <div className="flex gap-2">
                <Input
                  id={customId}
                  name="amountMlCustom"
                  inputMode="numeric"
                  placeholder="직접 입력"
                  aria-invalid={errors.amountMlCustom ? true : undefined}
                  className="h-10 w-32"
                />
                <SubmitButton variant="outline" className="h-10" pending={pending}>
                  저장
                </SubmitButton>
              </div>
              <FieldDescription>칩을 누르면 바로 저장해요.</FieldDescription>
              {errors.amountMlCustom && <FieldError>{errors.amountMlCustom}</FieldError>}
            </Field>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((amount) => (
                <Button
                  key={amount}
                  type="submit"
                  name="amountMl"
                  value={amount}
                  variant="secondary"
                  disabled={pending}
                  className="h-11 min-w-16"
                >
                  {amount}ml
                </Button>
              ))}
            </div>
          </>
        )}
      </FieldGroup>
      {method === 'breast' ? (
        <SaveFooter pending={pending} label={minutes ? '저장' : '타이머 시작'} />
      ) : (
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
        </DialogFooter>
      )}
    </>
  );
}

/** 기저귀: 고르면 바로 저장 (시각을 바꿀 때만 아래 칸을 고친다) */
function DiaperFields({
  defaultAt,
  errors,
  pending,
}: {
  defaultAt: string;
  errors: Errors;
  pending: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {DIAPER_KINDS.map((kind) => (
          <Button
            key={kind}
            type="submit"
            name="kind"
            value={kind}
            variant="secondary"
            disabled={pending}
            className="h-14 text-base"
          >
            {kind === 'both' ? '둘 다' : DIAPER_KIND_LABELS[kind]}
          </Button>
        ))}
      </div>
      {errors.kind && <FieldError>{errors.kind}</FieldError>}
      <TimeField label="시각" defaultValue={defaultAt} max={defaultAt} error={errors.at} />
    </>
  );
}

/** 약: 최근에 쓴 약 칩 + 양 */
function MedicineFields({
  defaultAt,
  recentMedicines,
  errors,
  pending,
}: {
  defaultAt: string;
  recentMedicines: string[];
  errors: Errors;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  return (
    <>
      <FieldGroup>
        <div className="flex flex-col gap-2">
          <TextField
            label="약 이름"
            name="name"
            placeholder="예: 해열제"
            maxLength={30}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
          />
          {recentMedicines.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="최근에 먹인 약">
              {recentMedicines.map((medicine) => (
                <Button
                  key={medicine}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setName(medicine)}
                >
                  {medicine}
                </Button>
              ))}
            </div>
          )}
        </div>
        <TextField
          label="양 (선택)"
          name="dose"
          placeholder="예: 2.5ml"
          maxLength={20}
          error={errors.dose}
        />
        <TimeField label="먹인 시각" defaultValue={defaultAt} max={defaultAt} error={errors.at} />
      </FieldGroup>
      <SaveFooter pending={pending} />
    </>
  );
}
