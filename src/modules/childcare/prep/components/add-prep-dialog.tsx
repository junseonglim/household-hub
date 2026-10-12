'use client';

import { Plus } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { toast } from 'sonner';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initialFormState, type FormState } from '@/lib/form-state';
import { PREP_CATEGORIES } from '../../constants';
import { addPrepItemAction } from '../actions';

/** [+ 추가]: 추천 목록에 없는 준비물 · 할 일 */
export function AddPrepDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-9" />}>
        <Plus aria-hidden />
        추가
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>준비물 추가</DialogTitle>
        </DialogHeader>
        <AddPrepForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddPrepForm({ onDone }: { onDone: () => void }) {
  const categoryId = useId();
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await addPrepItemAction(prev, formData);
    if (result.ok) {
      toast.success(result.message);
      onDone();
    }
    return result;
  }, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.ok === false && <FormMessage state={state} />}
      <FieldGroup>
        <TextField
          label="이름"
          name="title"
          placeholder="예: 아기 모빌"
          defaultValue={state.values?.title}
          maxLength={40}
          error={errors.title}
        />
        <TextField
          label="수량 (선택)"
          name="quantity"
          placeholder="예: 2개"
          defaultValue={state.values?.quantity}
          maxLength={20}
          error={errors.quantity}
        />
        <Field>
          <FieldLabel htmlFor={categoryId}>카테고리</FieldLabel>
          <NativeSelect
            id={categoryId}
            name="category"
            defaultValue={state.values?.category ?? '기타'}
            className="w-full"
          >
            {PREP_CATEGORIES.map((category) => (
              <NativeSelectOption key={category} value={category}>
                {category}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <TextField
          label="메모 (선택)"
          name="note"
          placeholder="예: 중고로 알아보기"
          defaultValue={state.values?.note}
          maxLength={100}
          error={errors.note}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
        <SubmitButton pendingLabel="추가하는 중…">추가</SubmitButton>
      </DialogFooter>
    </form>
  );
}
