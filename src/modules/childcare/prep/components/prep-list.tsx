'use client';

import { Pencil } from 'lucide-react';
import { useActionState, useId, useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initialFormState, type FormState } from '@/lib/form-state';
import { cn } from '@/lib/utils';
import { isPrepCategory, PREP_CATEGORIES, type PrepCategory } from '../../constants';
import { deletePrepItemAction, togglePrepItemAction, updatePrepItemAction } from '../actions';
import type { PrepListItem } from '../queries';

const categoryOf = (item: PrepListItem): PrepCategory =>
  isPrepCategory(item.category) ? item.category : '기타';

/**
 * 출산 준비 체크리스트 (docs/modules/childcare.md 4.5절). 카테고리별로, 체크하면 누가 했는지.
 * 체크는 서버 응답을 기다리지 않고 바로 반영한다.
 */
export function PrepList({ items }: { items: PrepListItem[] }) {
  const [optimisticItems, applyToggle] = useOptimistic(
    items,
    (state, change: { id: string; done: boolean }) =>
      state.map((item) => (item.id === change.id ? { ...item, isDone: change.done } : item)),
  );
  const [, startToggle] = useTransition();
  const toggle = (item: PrepListItem, done: boolean) =>
    startToggle(async () => {
      applyToggle({ id: item.id, done });
      const formData = new FormData();
      formData.set('itemId', item.id);
      formData.set('done', String(done));
      const result = await togglePrepItemAction(initialFormState, formData);
      if (!result.ok) toast.error(result.message);
    });

  const groups = PREP_CATEGORIES.map((category) => ({
    category,
    items: optimisticItems.filter((item) => categoryOf(item) === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const done = group.items.filter((item) => item.isDone).length;
        return (
          <section key={group.category} aria-label={group.category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {group.category}{' '}
              <span className="font-normal">
                ({done}/{group.items.length})
              </span>
            </h2>
            <ul className="divide-y rounded-xl border">
              {group.items.map((item) => (
                <PrepRow key={item.id} item={item} onToggle={toggle} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function PrepRow({
  item,
  onToggle,
}: {
  item: PrepListItem;
  onToggle: (item: PrepListItem, done: boolean) => void;
}) {
  const label = [item.title, item.quantity].filter(Boolean).join(' ');
  return (
    <li className="flex items-center gap-2 pr-2">
      <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 px-4 py-2">
        <input
          type="checkbox"
          checked={item.isDone}
          onChange={(event) => onToggle(item, event.target.checked)}
          aria-label={label}
          className="size-5 shrink-0 accent-primary"
        />
        <span className="min-w-0 flex-1">
          <span className={cn(item.isDone && 'text-muted-foreground line-through')}>{label}</span>
          {item.note && <span className="text-sm text-muted-foreground"> · {item.note}</span>}
        </span>
        {item.isDone && item.doneByName && (
          <span className="shrink-0 text-xs text-muted-foreground">{item.doneByName}</span>
        )}
      </label>
      <EditPrepDialog item={item} />
    </li>
  );
}

/** 항목 고치기 · 지우기 */
function EditPrepDialog({ item }: { item: PrepListItem }) {
  const categoryId = useId();
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
      closeOnSuccess(await updatePrepItemAction(prev, formData)),
    initialFormState,
  );
  const [deleteState, deleteAction] = useActionState(
    async (prev: FormState, formData: FormData) =>
      closeOnSuccess(await deletePrepItemAction(prev, formData)),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            aria-label={`${item.title} 고치기`}
          />
        }
      >
        <Pencil aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>준비물 고치기</DialogTitle>
        </DialogHeader>
        <form action={saveAction} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="itemId" value={item.id} />
          {state.ok === false && <FormMessage state={state} />}
          {deleteState.ok === false && <FormMessage state={deleteState} />}
          <FieldGroup>
            <TextField
              label="이름"
              name="title"
              defaultValue={state.values?.title ?? item.title}
              maxLength={40}
              error={errors.title}
            />
            <TextField
              label="수량 (선택)"
              name="quantity"
              placeholder="예: 4개"
              defaultValue={state.values?.quantity ?? item.quantity ?? ''}
              maxLength={20}
              error={errors.quantity}
            />
            <Field>
              <FieldLabel htmlFor={categoryId}>카테고리</FieldLabel>
              <NativeSelect
                id={categoryId}
                name="category"
                defaultValue={categoryOf(item)}
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
              placeholder="예: 선물 받음 — 이모"
              defaultValue={state.values?.note ?? item.note ?? ''}
              maxLength={100}
              error={errors.note}
            />
          </FieldGroup>
          <DialogFooter className="sm:justify-between">
            <SubmitButton formAction={deleteAction} variant="destructive" pendingLabel="지우는 중…">
              지우기
            </SubmitButton>
            <SubmitButton pendingLabel="저장하는 중…">저장</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
