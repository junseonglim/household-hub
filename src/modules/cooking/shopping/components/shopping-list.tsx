'use client';

import { useActionState, useId, useOptimistic, useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
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
import {
  clearCheckedAction,
  deleteItemAction,
  toggleItemAction,
  updateItemAction,
} from '../actions';
import { isShoppingCategory, SHOPPING_CATEGORIES, type ShoppingCategory } from '../category';
import { formatQuantity } from '../parse';
import type { ShoppingListItem } from '../queries';

const labelOf = (item: ShoppingListItem) =>
  [item.name, formatQuantity(item.quantity, item.unit)].filter(Boolean).join(' ');

const categoryOf = (item: ShoppingListItem): ShoppingCategory =>
  item.category && isShoppingCategory(item.category) ? item.category : '기타';

/**
 * 장보기 목록 (docs/modules/cooking.md 4.3절). 살 것은 카테고리별로, 산 것은 아래에 모은다.
 * 체크는 서버 응답을 기다리지 않고 바로 반영한다 (마트에서 한 손으로 빠르게).
 */
export function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  const [optimisticItems, applyToggle] = useOptimistic(
    items,
    (state, change: { id: string; checked: boolean }) =>
      state.map((item) => (item.id === change.id ? { ...item, isChecked: change.checked } : item)),
  );
  const [, startToggle] = useTransition();
  const toggle = (item: ShoppingListItem, checked: boolean) =>
    startToggle(async () => {
      applyToggle({ id: item.id, checked });
      const formData = new FormData();
      formData.set('itemId', item.id);
      formData.set('checked', String(checked));
      const result = await toggleItemAction(initialFormState, formData);
      if (!result.ok) toast.error(result.message);
    });

  const toBuy = optimisticItems.filter((item) => !item.isChecked);
  const bought = optimisticItems.filter((item) => item.isChecked);
  const groups = SHOPPING_CATEGORIES.map((category) => ({
    category,
    items: toBuy.filter((item) => categoryOf(item) === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {toBuy.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {bought.length > 0 ? '다 샀어요!' : '살 것이 없어요. 위에서 추가해 보세요.'}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.category} aria-label={group.category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{group.category}</h2>
            <ul className="divide-y rounded-xl border">
              {group.items.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={toggle} />
              ))}
            </ul>
          </section>
        ))
      )}

      {bought.length > 0 && (
        <section aria-labelledby="bought-heading" className="border-t pt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="bought-heading" className="text-sm font-semibold text-muted-foreground">
              산 것 {bought.length}
            </h2>
            <ClearCheckedButton />
          </div>
          <ul className="divide-y rounded-xl border">
            {bought.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggle} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
}: {
  item: ShoppingListItem;
  onToggle: (item: ShoppingListItem, checked: boolean) => void;
}) {
  return (
    <li className="flex items-center gap-2 pr-2">
      <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 px-4 py-2">
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={(event) => onToggle(item, event.target.checked)}
          className="size-5 shrink-0 accent-primary"
        />
        <span
          className={cn('min-w-0 flex-1', item.isChecked && 'text-muted-foreground line-through')}
        >
          {labelOf(item)}
          {item.note && <span className="text-sm text-muted-foreground"> · {item.note}</span>}
        </span>
        {item.isChecked && item.checkedByName && (
          <span className="shrink-0 text-xs text-muted-foreground">{item.checkedByName}</span>
        )}
      </label>
      {!item.isChecked && <EditItemDialog item={item} />}
    </li>
  );
}

/** 항목 고치기 · 지우기 (카테고리를 바꾸면 다음에 같은 이름을 넣을 때도 그 카테고리로) */
function EditItemDialog({ item }: { item: ShoppingListItem }) {
  const categoryId = useId();
  const [open, setOpen] = useState(false);
  const onResult = (message: string) => (result: FormState) => {
    if (result.ok) {
      setOpen(false);
      toast(message);
    }
    return result;
  };
  const [state, saveAction] = useActionState(
    async (prev: FormState, formData: FormData) =>
      onResult('저장했어요.')(await updateItemAction(prev, formData)),
    initialFormState,
  );
  const [deleteState, deleteAction] = useActionState(
    async (prev: FormState, formData: FormData) =>
      onResult(`${item.name}을(를) 지웠어요.`)(await deleteItemAction(prev, formData)),
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
            aria-label={`${item.name} 고치기`}
          />
        }
      >
        <Pencil aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>장보기 항목 고치기</DialogTitle>
        </DialogHeader>
        <form action={saveAction} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="itemId" value={item.id} />
          {state.ok === false && <FormMessage state={state} />}
          {deleteState.ok === false && <FormMessage state={deleteState} />}
          <FieldGroup>
            <TextField
              label="이름"
              name="name"
              defaultValue={item.name}
              maxLength={30}
              error={errors.name}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="수량"
                name="quantity"
                inputMode="decimal"
                defaultValue={item.quantity?.toString() ?? ''}
                error={errors.quantity}
              />
              <TextField
                label="단위"
                name="unit"
                placeholder="개, g, 단"
                defaultValue={item.unit ?? ''}
                maxLength={10}
                error={errors.unit}
              />
            </div>
            <Field>
              <FieldLabel htmlFor={categoryId}>카테고리</FieldLabel>
              <NativeSelect
                id={categoryId}
                name="category"
                defaultValue={categoryOf(item)}
                className="w-full"
              >
                {SHOPPING_CATEGORIES.map((category) => (
                  <NativeSelectOption key={category} value={category}>
                    {category}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <TextField
              label="메모 (선택)"
              name="note"
              placeholder="예: 큰 걸로"
              defaultValue={item.note ?? ''}
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

function ClearCheckedButton() {
  const [, formAction, pending] = useActionState(async () => {
    const result = await clearCheckedAction();
    if (result.ok) toast(result.message);
    else toast.error(result.message);
    return result;
  }, initialFormState);
  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? '정리하는 중…' : '정리'}
      </Button>
    </form>
  );
}
