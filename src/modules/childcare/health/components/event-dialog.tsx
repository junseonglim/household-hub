'use client';

import { Pencil, Plus } from 'lucide-react';
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
import type { LocalDate } from '@/lib/local-date';
import {
  CUSTOM_EVENT_KINDS,
  HEALTH_EVENT_KIND_ICONS,
  HEALTH_EVENT_KIND_LABELS,
  type CustomEventKind,
} from '../../constants';
import { addEventAction, deleteEventAction, updateEventAction } from '../actions';

export type EditableEvent = {
  id: string;
  kind: string;
  title: string;
  dueDate: LocalDate | null;
  time: string | null;
  place: string | null;
  note: string | null;
};

type EventDialogProps =
  | { mode: 'add'; childId: string; defaultDate: LocalDate; defaultKind: CustomEventKind }
  | { mode: 'edit'; event: EditableEvent };

const TITLE_PLACEHOLDERS: Record<CustomEventKind, string> = {
  prenatal: '예: 정기검진, 정밀 초음파',
  visit: '예: 감기 진료',
  vaccination: '예: 일본뇌염 2차',
  appointment: '예: 조리원 투어, 100일 사진',
};

/** [+ 일정] · 직접 추가한 일정 고치기 (산부인과 · 병원 방문 · 접종 · 그 밖의 일정) */
export function EventDialog(props: EventDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = props.mode === 'edit';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`${props.event.title} 고치기`}
            />
          ) : (
            <Button className="h-9" aria-label="일정 넣기" />
          )
        }
      >
        {isEdit ? (
          <Pencil aria-hidden />
        ) : (
          <>
            <Plus aria-hidden />
            일정
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '일정 고치기' : '일정 넣기'}</DialogTitle>
        </DialogHeader>
        <EventForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EventForm(props: EventDialogProps & { onDone: () => void }) {
  const ids = { date: useId(), time: useId(), note: useId() };
  const event = props.mode === 'edit' ? props.event : null;
  const initialKind = (
    event && (CUSTOM_EVENT_KINDS as readonly string[]).includes(event.kind)
      ? event.kind
      : props.mode === 'add'
        ? props.defaultKind
        : 'appointment'
  ) as CustomEventKind;
  const [kind, setKind] = useState<CustomEventKind>(initialKind);
  // 종류는 상태로 관리하므로 제출 후 폼을 초기화하지 않는다
  const [state, formProps, pending] = usePersistentFormAction(
    async (prev: FormState, formData: FormData) => {
      const action =
        formData.get('intent') === 'delete'
          ? deleteEventAction
          : event
            ? updateEventAction
            : addEventAction;
      const result = await action(prev, formData);
      if (result.ok) {
        toast.success(result.message);
        props.onDone();
      }
      return result;
    },
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form {...formProps} noValidate className="flex flex-col gap-4">
      {state.ok === false && <FormMessage state={state} />}
      {event ? (
        <input type="hidden" name="eventId" value={event.id} />
      ) : (
        props.mode === 'add' && <input type="hidden" name="childId" value={props.childId} />
      )}
      <FieldGroup>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">종류</legend>
          <div className="flex flex-wrap gap-2">
            {CUSTOM_EVENT_KINDS.map((option) => (
              <ChoiceChip
                key={option}
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
              >
                {HEALTH_EVENT_KIND_ICONS[option]} {HEALTH_EVENT_KIND_LABELS[option]}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
        <TextField
          label="일정 이름"
          name="title"
          defaultValue={event?.title}
          maxLength={40}
          placeholder={TITLE_PLACEHOLDERS[kind]}
          error={errors.title}
        />
        <div className="flex flex-wrap gap-3">
          <Field data-invalid={errors.date ? true : undefined} className="w-auto">
            <FieldLabel htmlFor={ids.date}>날짜</FieldLabel>
            <div>
              <Input
                id={ids.date}
                type="date"
                name="date"
                defaultValue={event?.dueDate ?? (props.mode === 'add' ? props.defaultDate : '')}
                aria-invalid={errors.date ? true : undefined}
                className="h-10 w-44"
              />
            </div>
            {errors.date && <FieldError>{errors.date}</FieldError>}
          </Field>
          <Field data-invalid={errors.time ? true : undefined} className="w-auto">
            <FieldLabel htmlFor={ids.time}>시각 (선택)</FieldLabel>
            <div>
              <Input
                id={ids.time}
                type="time"
                name="time"
                defaultValue={event?.time ?? ''}
                aria-invalid={errors.time ? true : undefined}
                className="h-10 w-32"
              />
            </div>
            {errors.time && <FieldError>{errors.time}</FieldError>}
          </Field>
        </div>
        <TextField
          label="장소 (선택)"
          name="place"
          defaultValue={event?.place ?? ''}
          maxLength={40}
          placeholder={kind === 'prenatal' ? '예: 우리여성병원' : '예: 우리소아과'}
          error={errors.place}
        />
        <Field data-invalid={errors.note ? true : undefined}>
          <FieldLabel htmlFor={ids.note}>메모 (선택)</FieldLabel>
          <Textarea
            id={ids.note}
            name="note"
            rows={3}
            maxLength={500}
            defaultValue={event?.note ?? ''}
            placeholder={kind === 'visit' ? '예: 증상 · 진단 · 처방' : '예: 준비물, 물어볼 것'}
          />
          {errors.note && <FieldError>{errors.note}</FieldError>}
        </Field>
      </FieldGroup>
      <DialogFooter className={event ? 'sm:justify-between' : undefined}>
        {event ? (
          <Button
            type="submit"
            name="intent"
            value="delete"
            variant="destructive"
            disabled={pending}
          >
            지우기
          </Button>
        ) : (
          <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
        )}
        <SubmitButton name="intent" value="save" pending={pending} pendingLabel="저장하는 중…">
          {event ? '저장' : '넣기'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
