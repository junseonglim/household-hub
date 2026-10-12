'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
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
import { completeEventsAction, dismissEventsAction } from '../actions';

type CompleteDialogProps = {
  events: { id: string; title: string; standardCode: string | null; kind: string }[];
  today: LocalDate;
};

/**
 * [했어요]: 한 날 · 장소 · 메모를 남긴다. 같은 날 맞히는 접종은 함께 고르고(혼합 백신),
 * 맞히지 않을 표준 일정은 [해당 없음]으로 숨긴다.
 */
export function CompleteDialog({ events, today }: CompleteDialogProps) {
  const [open, setOpen] = useState(false);
  const titles = events.map((event) => event.title).join(' · ');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" aria-label={`${titles} 했어요`} />}
      >
        했어요
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>했어요</DialogTitle>
          <DialogDescription>{titles}</DialogDescription>
        </DialogHeader>
        {/* 창을 열 때마다 새로 그려서 지난 입력이 남지 않게 한다 */}
        <CompleteForm events={events} today={today} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CompleteForm({ events, today, onDone }: CompleteDialogProps & { onDone: () => void }) {
  const ids = { doneOn: useId(), place: useId(), note: useId() };
  const dismissable = events.every((event) => event.standardCode !== null);
  const isVaccination = events.some((event) => event.kind === 'vaccination');
  // 접종 고르기를 실패한 뒤에도 그대로 두려고 폼을 초기화하지 않는다
  const [state, formProps, pending] = usePersistentFormAction(
    async (prev: FormState, formData: FormData) => {
      const action =
        formData.get('intent') === 'dismiss' ? dismissEventsAction : completeEventsAction;
      const result = await action(prev, formData);
      if (result.ok) {
        toast.success(result.message);
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
      {events.length === 1 ? (
        <input type="hidden" name="eventIds" value={events[0]!.id} />
      ) : (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-sm font-medium">함께 한 것</legend>
          {events.map((event) => (
            <label key={event.id} className="flex min-h-10 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="eventIds"
                value={event.id}
                defaultChecked
                className="size-4.5 accent-primary"
              />
              {event.title}
            </label>
          ))}
          {errors.eventIds && <FieldError>{errors.eventIds}</FieldError>}
        </fieldset>
      )}
      <FieldGroup>
        <Field data-invalid={errors.doneOn ? true : undefined}>
          <FieldLabel htmlFor={ids.doneOn}>한 날</FieldLabel>
          <div>
            <Input
              id={ids.doneOn}
              type="date"
              name="doneOn"
              defaultValue={today}
              max={today}
              aria-invalid={errors.doneOn ? true : undefined}
              className="h-10 w-44"
            />
          </div>
          {errors.doneOn && <FieldError>{errors.doneOn}</FieldError>}
        </Field>
        <Field data-invalid={errors.place ? true : undefined}>
          <FieldLabel htmlFor={ids.place}>장소 (선택)</FieldLabel>
          <Input
            id={ids.place}
            name="place"
            maxLength={40}
            placeholder={isVaccination ? '예: 우리소아과' : '예: 주민센터'}
            className="h-10"
          />
          {errors.place && <FieldError>{errors.place}</FieldError>}
        </Field>
        <Field data-invalid={errors.note ? true : undefined}>
          <FieldLabel htmlFor={ids.note}>메모 (선택)</FieldLabel>
          <Textarea
            id={ids.note}
            name="note"
            rows={2}
            maxLength={500}
            placeholder={isVaccination ? '예: 백신 이름 · 로트 번호, 접종 뒤 미열' : ''}
          />
          {errors.note && <FieldError>{errors.note}</FieldError>}
        </Field>
      </FieldGroup>
      <DialogFooter className="sm:justify-between">
        {dismissable ? (
          <Button
            type="submit"
            name="intent"
            value="dismiss"
            variant="ghost"
            disabled={pending}
            className="text-muted-foreground"
          >
            {events.length > 1 ? '고른 것 해당 없음' : '해당 없음'}
          </Button>
        ) : (
          <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
        )}
        <SubmitButton name="intent" value="done" pending={pending} pendingLabel="기록하는 중…">
          기록
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
