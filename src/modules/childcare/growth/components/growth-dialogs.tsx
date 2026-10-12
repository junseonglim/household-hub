'use client';

import { Pencil, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { initialFormState, type FormState } from '@/lib/form-state';
import { formatShortDate, type LocalDate } from '@/lib/local-date';
import { MILESTONE_PRESETS } from '../../constants';
import {
  addMeasurementAction,
  addMilestoneAction,
  deleteMeasurementAction,
  deleteMilestoneAction,
  updateMeasurementAction,
  updateMilestoneAction,
} from '../actions';
import type { GrowthRow } from '../growth';
import type { MilestoneItem } from '../queries';

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** 저장 · 지우기를 한 폼에서 (intent로 나눈다). 성공하면 토스트 + 창 닫기 */
function useDialogForm(save: Action, remove: Action, onDone: () => void) {
  return usePersistentFormAction(async (prev: FormState, formData: FormData) => {
    const action = formData.get('intent') === 'delete' ? remove : save;
    const result = await action(prev, formData);
    if (result.ok) {
      toast.success(result.message);
      onDone();
    }
    return result;
  }, initialFormState);
}

type Trigger = { render: React.ReactElement; content: React.ReactNode };

function DialogShell({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: Trigger;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger.render}>{trigger.content}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

function DateField({
  label,
  name,
  defaultValue,
  max,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  max: string;
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
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function NoteField({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>메모 (선택)</FieldLabel>
      <Textarea id={id} name="note" rows={2} maxLength={200} defaultValue={defaultValue} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function Footer({ isEdit, pending }: { isEdit: boolean; pending: boolean }) {
  return (
    <DialogFooter className={isEdit ? 'sm:justify-between' : undefined}>
      {isEdit ? (
        <Button type="submit" name="intent" value="delete" variant="destructive" disabled={pending}>
          지우기
        </Button>
      ) : (
        <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
      )}
      <SubmitButton name="intent" value="save" pending={pending} pendingLabel="저장하는 중…">
        저장
      </SubmitButton>
    </DialogFooter>
  );
}

const addTrigger = (label: string): Trigger => ({
  render: <Button className="h-9" aria-label={`${label} 추가`} />,
  content: (
    <>
      <Plus aria-hidden />
      {label}
    </>
  ),
});

const editTrigger = (label: string): Trigger => ({
  render: (
    <Button
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-muted-foreground"
      aria-label={label}
    />
  ),
  content: <Pencil aria-hidden />,
});

/** [+ 측정] · 측정 기록 고치기: 몸무게 · 키 · 머리둘레 중 하나 이상 */
export function MeasurementDialog(
  props: { today: LocalDate } & ({ childId: string } | { record: GrowthRow }),
) {
  const record = 'record' in props ? props.record : null;
  return (
    <DialogShell
      title={record ? '측정 기록 고치기' : '측정 기록'}
      trigger={
        record
          ? editTrigger(`${formatShortDate(record.measuredOn)} 측정 고치기`)
          : addTrigger('측정')
      }
    >
      {(close) => <MeasurementForm {...props} onDone={close} />}
    </DialogShell>
  );
}

function MeasurementForm(
  props: { today: LocalDate; onDone: () => void } & ({ childId: string } | { record: GrowthRow }),
) {
  const record = 'record' in props ? props.record : null;
  const [state, formProps, pending] = useDialogForm(
    record ? updateMeasurementAction : addMeasurementAction,
    deleteMeasurementAction,
    props.onDone,
  );
  const errors = state.fieldErrors ?? {};
  const value = (number: number | null | undefined) => (number == null ? '' : String(number));

  return (
    <form {...formProps} noValidate className="flex flex-col gap-4">
      {state.ok === false && <FormMessage state={state} />}
      {record ? (
        <input type="hidden" name="recordId" value={record.id} />
      ) : (
        'childId' in props && <input type="hidden" name="childId" value={props.childId} />
      )}
      <FieldGroup>
        <DateField
          label="잰 날"
          name="measuredOn"
          defaultValue={record?.measuredOn ?? props.today}
          max={props.today}
          error={errors.measuredOn}
        />
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label="몸무게 kg"
            name="weightKg"
            inputMode="decimal"
            placeholder="5.1"
            defaultValue={value(record?.weightKg)}
            error={errors.weightKg}
          />
          <TextField
            label="키 cm"
            name="heightCm"
            inputMode="decimal"
            placeholder="58.2"
            defaultValue={value(record?.heightCm)}
            error={errors.heightCm}
          />
          <TextField
            label="머리둘레 cm"
            name="headCm"
            inputMode="decimal"
            placeholder="39.1"
            defaultValue={value(record?.headCm)}
            error={errors.headCm}
          />
        </div>
        <NoteField defaultValue={record?.note ?? ''} error={errors.note} />
      </FieldGroup>
      <Footer isEdit={record !== null} pending={pending} />
    </form>
  );
}

/** [+ 발달 기록] · 고치기: 추천 칩(첫 미소 · 뒤집기 …) 또는 직접 입력 */
export function MilestoneDialog(
  props: { today: LocalDate } & ({ childId: string } | { milestone: MilestoneItem }),
) {
  const milestone = 'milestone' in props ? props.milestone : null;
  return (
    <DialogShell
      title={milestone ? '발달 기록 고치기' : '발달 기록'}
      trigger={milestone ? editTrigger(`${milestone.title} 고치기`) : addTrigger('발달 기록')}
    >
      {(close) => <MilestoneForm {...props} onDone={close} />}
    </DialogShell>
  );
}

function MilestoneForm(
  props: { today: LocalDate; onDone: () => void } & (
    { childId: string } | { milestone: MilestoneItem }
  ),
) {
  const milestone = 'milestone' in props ? props.milestone : null;
  const [title, setTitle] = useState(milestone?.title ?? '');
  const [state, formProps, pending] = useDialogForm(
    milestone ? updateMilestoneAction : addMilestoneAction,
    deleteMilestoneAction,
    props.onDone,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form {...formProps} noValidate className="flex flex-col gap-4">
      {state.ok === false && <FormMessage state={state} />}
      {milestone ? (
        <input type="hidden" name="milestoneId" value={milestone.id} />
      ) : (
        'childId' in props && <input type="hidden" name="childId" value={props.childId} />
      )}
      <FieldGroup>
        <div className="flex flex-col gap-2">
          <TextField
            label="무엇을 했나요?"
            name="title"
            placeholder="예: 뒤집기"
            maxLength={30}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
          />
          {!milestone && (
            <div className="flex flex-wrap gap-2" aria-label="추천">
              {MILESTONE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={title === preset ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setTitle(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          )}
        </div>
        <DateField
          label="날짜"
          name="achievedOn"
          defaultValue={milestone?.achievedOn ?? props.today}
          max={props.today}
          error={errors.achievedOn}
        />
        <NoteField defaultValue={milestone?.note ?? ''} error={errors.note} />
      </FieldGroup>
      <Footer isEdit={milestone !== null} pending={pending} />
    </form>
  );
}
