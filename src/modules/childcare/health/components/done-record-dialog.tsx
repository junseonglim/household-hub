'use client';

import { useActionState, useId, useState } from 'react';
import { toast } from 'sonner';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { editDoneAction, restoreEventAction, undoCompletionAction } from '../actions';

type DoneEvent = {
  id: string;
  title: string;
  doneOn: LocalDate | null;
  place: string | null;
  note: string | null;
};

/** 한 일정의 기록(한 날 · 장소 · 메모) 고치기 · 완료 취소 */
export function DoneRecordDialog({ event, today }: { event: DoneEvent; today: LocalDate }) {
  const ids = { doneOn: useId(), place: useId(), note: useId() };
  const [open, setOpen] = useState(false);
  const closeOnSuccess = (result: FormState) => {
    if (result.ok) {
      setOpen(false);
      toast(result.message);
    }
    return result;
  };
  const [state, saveAction] = useActionState(
    async (prev: FormState, formData: FormData) =>
      closeOnSuccess(await editDoneAction(prev, formData)),
    initialFormState,
  );
  const [undoState, undoAction] = useActionState(
    async (prev: FormState, formData: FormData) =>
      closeOnSuccess(await undoCompletionAction(prev, formData)),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            aria-label={`${event.title} 기록 고치기`}
          />
        }
      >
        고치기
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>기록 고치기</DialogTitle>
          <DialogDescription>{event.title}</DialogDescription>
        </DialogHeader>
        <form action={saveAction} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="eventId" value={event.id} />
          {state.ok === false && <FormMessage state={state} />}
          {undoState.ok === false && <FormMessage state={undoState} />}
          <FieldGroup>
            <Field data-invalid={errors.doneOn ? true : undefined}>
              <FieldLabel htmlFor={ids.doneOn}>한 날</FieldLabel>
              <div>
                <Input
                  id={ids.doneOn}
                  type="date"
                  name="doneOn"
                  defaultValue={state.values?.doneOn ?? event.doneOn ?? today}
                  max={today}
                  className="h-10 w-44"
                />
              </div>
              {errors.doneOn && <FieldError>{errors.doneOn}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.place}>장소</FieldLabel>
              <Input
                id={ids.place}
                name="place"
                maxLength={40}
                defaultValue={state.values?.place ?? event.place ?? ''}
                className="h-10"
              />
              {errors.place && <FieldError>{errors.place}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.note}>메모</FieldLabel>
              <Textarea
                id={ids.note}
                name="note"
                rows={3}
                maxLength={500}
                defaultValue={state.values?.note ?? event.note ?? ''}
              />
              {errors.note && <FieldError>{errors.note}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter className="sm:justify-between">
            <SubmitButton formAction={undoAction} variant="outline" pendingLabel="취소하는 중…">
              완료 취소
            </SubmitButton>
            <SubmitButton pendingLabel="저장하는 중…">저장</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** [해당 없음]으로 숨긴 표준 일정 되살리기 */
export function RestoreEventButton({ eventId, title }: { eventId: string; title: string }) {
  const [, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await restoreEventAction(prev, formData);
    if (result.ok) toast(result.message);
    else toast.error(result.message);
    return result;
  }, initialFormState);
  return (
    <form action={formAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`${title} 되살리기`}
      >
        되살리기
      </Button>
    </form>
  );
}
