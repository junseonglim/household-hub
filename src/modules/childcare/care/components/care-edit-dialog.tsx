'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { ChoiceChip } from '@/components/form/choice-chip';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { initialFormState, type FormState } from '@/lib/form-state';
import { localDateTimeOf } from '@/lib/local-date';
import {
  BREAST_SIDE_LABELS,
  BREAST_SIDES,
  CARE_LOG_ICONS,
  CARE_LOG_LABELS,
  DIAPER_KIND_LABELS,
  DIAPER_KINDS,
  FEEDING_METHOD_LABELS,
} from '../../constants';
import { deleteCareLogAction, updateCareLogAction } from '../actions';
import { describeCareRecord, isTimerRecord, type CareRecord } from '../logic';
import { TimeField } from './care-fields';

type Details = Partial<Record<string, string | number | null>>;

/** 타임라인 · 진행 중 카드에서 기록 고치기 · 지우기 */
export function CareEditDialog({
  record,
  timezone,
  open,
  onOpenChange,
}: {
  record: CareRecord;
  timezone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {CARE_LOG_ICONS[record.type]} {CARE_LOG_LABELS[record.type]} 기록 고치기
          </DialogTitle>
          <DialogDescription>
            {describeCareRecord(record, new Date())}
            {record.recordedByName && ` · ${record.recordedByName} 기록`}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CareEditForm record={record} timezone={timezone} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CareEditForm({
  record,
  timezone,
  onDone,
}: {
  record: CareRecord;
  timezone: string;
  onDone: () => void;
}) {
  const noteId = useId();
  const details = record.details as Details;
  const isTimer = isTimerRecord(record);
  const now = localDateTimeOf(new Date(), timezone);
  const [state, formProps, pending] = usePersistentFormAction(
    async (prev: FormState, formData: FormData) => {
      const action =
        formData.get('intent') === 'delete' ? deleteCareLogAction : updateCareLogAction;
      const result = await action(prev, formData);
      if (result.ok) {
        toast(result.message);
        onDone();
      }
      return result;
    },
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form {...formProps} noValidate className="flex flex-col gap-4">
      {state.ok === false && <FormMessage state={state} />}
      <input type="hidden" name="logId" value={record.id} />
      <input type="hidden" name="type" value={record.type} />
      <FieldGroup>
        {record.type === 'feeding' && details.method === 'breast' && (
          <>
            <input type="hidden" name="method" value="breast" />
            <ChipGroup
              legend="쪽"
              name="side"
              options={BREAST_SIDES.map((side) => [side, BREAST_SIDE_LABELS[side]])}
              defaultValue={String(details.side)}
              error={errors.side}
            />
          </>
        )}
        {record.type === 'feeding' && details.method !== 'breast' && (
          <>
            <ChipGroup
              legend="방법"
              name="method"
              options={(['pumped', 'formula'] as const).map((method) => [
                method,
                FEEDING_METHOD_LABELS[method],
              ])}
              defaultValue={String(details.method)}
              error={errors.method}
            />
            <TextField
              label="양 (ml)"
              name="amountMlCustom"
              inputMode="numeric"
              defaultValue={String(details.amountMl ?? '')}
              error={errors.amountMlCustom}
            />
          </>
        )}
        {record.type === 'diaper' && (
          <ChipGroup
            legend="기저귀"
            name="kind"
            options={DIAPER_KINDS.map((kind) => [kind, DIAPER_KIND_LABELS[kind]])}
            defaultValue={String(details.kind)}
            error={errors.kind}
          />
        )}
        {record.type === 'temperature' && (
          <TextField
            label="체온 (℃)"
            name="celsius"
            inputMode="decimal"
            defaultValue={String(details.celsius ?? '')}
            error={errors.celsius}
          />
        )}
        {record.type === 'medicine' && (
          <>
            <TextField
              label="약 이름"
              name="name"
              maxLength={30}
              defaultValue={String(details.name ?? '')}
              error={errors.name}
            />
            <TextField
              label="양 (선택)"
              name="dose"
              maxLength={20}
              defaultValue={String(details.dose ?? '')}
              error={errors.dose}
            />
          </>
        )}
        <TimeField
          label={isTimer ? '시작 시각' : '시각'}
          defaultValue={localDateTimeOf(record.startedAt, timezone)}
          max={now}
          error={errors.at}
        />
        {isTimer && (
          <TimeField
            label="끝 시각"
            name="endAt"
            defaultValue={record.endedAt ? localDateTimeOf(record.endedAt, timezone) : ''}
            max={now}
            description={
              record.type === 'sleep' ? '비워 두면 자는 중이에요.' : '비워 두면 먹는 중이에요.'
            }
            error={errors.endAt}
          />
        )}
        <Field>
          <FieldLabel htmlFor={noteId}>메모 (선택)</FieldLabel>
          <Textarea
            id={noteId}
            name="note"
            rows={2}
            maxLength={200}
            defaultValue={record.note ?? ''}
          />
          {errors.note && <FieldError>{errors.note}</FieldError>}
        </Field>
      </FieldGroup>
      <DialogFooter className="sm:justify-between">
        <Button type="submit" name="intent" value="delete" variant="destructive" disabled={pending}>
          지우기
        </Button>
        <SubmitButton name="intent" value="save" pending={pending} pendingLabel="저장하는 중…">
          저장
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function ChipGroup({
  legend,
  name,
  options,
  defaultValue,
  error,
}: {
  legend: string;
  name: string;
  options: [string, string][];
  defaultValue: string;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => (
          <ChoiceChip key={value} name={name} value={value} defaultChecked={defaultValue === value}>
            {label}
          </ChoiceChip>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </fieldset>
  );
}

/** 진행 중 카드 등에서 바로 고치기 창을 여는 버튼 */
export function CareEditButton({
  record,
  timezone,
  children,
  className,
  label,
}: {
  record: CareRecord;
  timezone: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} aria-label={label} onClick={() => setOpen(true)}>
        {children}
      </button>
      <CareEditDialog record={record} timezone={timezone} open={open} onOpenChange={setOpen} />
    </>
  );
}
