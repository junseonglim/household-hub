'use client';

import { Ellipsis } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/form-state';
import { localDateTimeOf } from '@/lib/local-date';
import type { ActiveMember } from '@/modules/core/household/queries';
import { completeTaskAction, type CompletedTask } from '../actions';
import { showCompletedToast } from './use-complete-task';

type CompleteDialogProps = {
  task: { id: string; title: string; nextDueDate: string | null };
  members: ActiveMember[];
  myMemberId: string;
  timezone: string;
  /** icon: 목록의 ⋯ 버튼, button: 상세 화면의 글자 버튼 */
  trigger?: 'icon' | 'button';
};

/** 다른 사람이 한 것으로 · 지난 시각으로 · 메모와 함께 완료를 기록한다 */
export function CompleteDialog({
  task,
  members,
  myMemberId,
  timezone,
  trigger = 'icon',
}: CompleteDialogProps) {
  const ids = { member: useId(), time: useId(), note: useId() };
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState('');
  const [state, formAction] = useActionState(
    async (prev: FormState<CompletedTask>, formData: FormData) => {
      const result = await completeTaskAction(prev, formData);
      if (result.ok) {
        setOpen(false);
        showCompletedToast(result);
      }
      return result;
    },
    { ok: null },
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 창을 열 때마다 '지금'을 기본값으로
        if (next) setNow(localDateTimeOf(new Date(), timezone));
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          trigger === 'icon' ? (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground"
              aria-label={`${task.title} 자세히 기록`}
            />
          ) : (
            <Button variant="outline" className="h-10" />
          )
        }
      >
        {trigger === 'icon' ? <Ellipsis aria-hidden /> : '자세히 기록'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>완료 기록하기</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>
        <form action={formAction} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="expectedDueDate" value={task.nextDueDate ?? ''} />
          {state.ok === false && <FormMessage state={state} />}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={ids.member}>한 사람</FieldLabel>
              <NativeSelect
                id={ids.member}
                name="completedByMemberId"
                defaultValue={myMemberId}
                className="w-full"
              >
                {members.map((member) => (
                  <NativeSelectOption key={member.id} value={member.id}>
                    {member.displayName}
                    {member.id === myMemberId ? ' (나)' : ''}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field data-invalid={state.fieldErrors?.completedAt ? true : undefined}>
              <FieldLabel htmlFor={ids.time}>완료 시각</FieldLabel>
              <Input
                id={ids.time}
                type="datetime-local"
                name="completedAt"
                defaultValue={state.values?.completedAt ?? now}
                max={now}
                className="h-10"
                aria-invalid={state.fieldErrors?.completedAt ? true : undefined}
              />
              {state.fieldErrors?.completedAt && (
                <FieldError>{state.fieldErrors.completedAt}</FieldError>
              )}
            </Field>
            <Field data-invalid={state.fieldErrors?.note ? true : undefined}>
              <FieldLabel htmlFor={ids.note}>메모 (선택)</FieldLabel>
              <Textarea
                id={ids.note}
                name="note"
                rows={2}
                maxLength={200}
                defaultValue={state.values?.note}
                placeholder="예: 배수구도 같이 청소함"
              />
              {state.fieldErrors?.note && <FieldError>{state.fieldErrors.note}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
            <SubmitButton pendingLabel="기록하는 중…">완료 기록</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
