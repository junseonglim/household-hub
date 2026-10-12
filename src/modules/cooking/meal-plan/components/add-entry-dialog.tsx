'use client';

import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { ChoiceChip } from '@/components/form/choice-chip';
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initialFormState, type FormState } from '@/lib/form-state';
import { formatShortDate, type LocalDate } from '@/lib/local-date';
import type { ActiveMember } from '@/modules/core/household/queries';
import {
  MEAL_KIND_LABELS,
  MEAL_KINDS,
  MEAL_TYPE_LABELS,
  MEAL_TYPES,
  type MealKind,
  type MealType,
} from '../../constants';
import { addEntryAction } from '../actions';

type AddEntryDialogProps = {
  /** 날짜가 정해진 칸에서 열면 날짜 칸을 숨긴다 */
  date?: LocalDate;
  /** 날짜를 고를 때의 기본값 (레시피 화면에서 열 때) */
  defaultDate: LocalDate;
  recipes: { id: string; title: string }[];
  members: ActiveMember[];
  /** 레시피 화면에서 '식단에 추가'로 열 때 */
  recipe?: { id: string; title: string };
  trigger?: 'day' | 'recipe';
};

/** 식단에 메뉴 넣기: 끼니 · 집밥/외식/배달 · 레시피 또는 직접 입력 · 요리 담당 */
export function AddEntryDialog({ date, trigger = 'day', ...props }: AddEntryDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger === 'day' ? (
            <Button variant="ghost" size="sm" aria-label={`${formatShortDate(date!)} 메뉴 추가`} />
          ) : (
            <Button className="h-10 px-4" />
          )
        }
      >
        <Plus aria-hidden />
        {trigger === 'day' ? '메뉴' : '식단에 추가'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>식단에 메뉴 넣기</DialogTitle>
          <DialogDescription>
            {date ? formatShortDate(date) : (props.recipe?.title ?? '')}
          </DialogDescription>
        </DialogHeader>
        {/* 창을 열 때마다 새로 그려서 지난 입력이 남지 않게 한다 */}
        <AddEntryForm date={date} {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddEntryForm({
  date,
  defaultDate,
  recipes,
  members,
  recipe,
  onDone,
}: Omit<AddEntryDialogProps, 'trigger'> & { onDone: () => void }) {
  const ids = { date: useId(), recipe: useId(), title: useId(), cook: useId() };
  const [kind, setKind] = useState<MealKind>('home');
  const [recipeId, setRecipeId] = useState(recipe?.id ?? '');
  const [title, setTitle] = useState(recipe?.title ?? '');
  // 종류(집밥/외식/배달)는 상태로 관리하므로 제출 후 폼을 초기화하지 않는다
  const [state, formProps, pending] = usePersistentFormAction(
    async (prev: FormState, formData: FormData) => {
      const result = await addEntryAction(prev, formData);
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
      {date && <input type="hidden" name="date" value={date} />}
      <FieldGroup>
        {!date && (
          <Field data-invalid={errors.date ? true : undefined}>
            <FieldLabel htmlFor={ids.date}>날짜</FieldLabel>
            <div>
              <Input
                id={ids.date}
                type="date"
                name="date"
                defaultValue={defaultDate}
                className="h-10 w-44"
              />
            </div>
            {errors.date && <FieldError>{errors.date}</FieldError>}
          </Field>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">끼니</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((mealType: MealType) => (
              <ChoiceChip
                key={mealType}
                name="mealType"
                value={mealType}
                defaultChecked={mealType === 'dinner'}
              >
                {MEAL_TYPE_LABELS[mealType]}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">종류</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_KINDS.map((option) => (
              <ChoiceChip
                key={option}
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
              >
                {MEAL_KIND_LABELS[option]}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
        {kind === 'home' && recipes.length > 0 && (
          <Field>
            <FieldLabel htmlFor={ids.recipe}>레시피 (선택)</FieldLabel>
            <NativeSelect
              id={ids.recipe}
              name="recipeId"
              value={recipeId}
              onChange={(event) => {
                const picked = recipes.find((option) => option.id === event.target.value);
                // 이름 칸이 비었거나 전에 고른 레시피 이름이면 새 레시피 이름으로 바꾼다
                const previous = recipes.find((option) => option.id === recipeId);
                if (picked && (!title || title === previous?.title)) setTitle(picked.title);
                setRecipeId(event.target.value);
              }}
              className="w-full"
            >
              <NativeSelectOption value="">고르지 않음 (직접 입력)</NativeSelectOption>
              {recipes.map((option) => (
                <NativeSelectOption key={option.id} value={option.id}>
                  {option.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor={ids.title}>
            {kind === 'home' ? '메뉴 이름' : '메뉴 이름 (선택)'}
          </FieldLabel>
          <Input
            id={ids.title}
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={40}
            placeholder={kind === 'home' ? '예: 된장찌개' : '예: 동네 칼국수'}
            aria-invalid={errors.title ? true : undefined}
            className="h-10"
          />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </Field>
        {kind === 'home' && (
          <Field>
            <FieldLabel htmlFor={ids.cook}>요리 담당 (선택)</FieldLabel>
            <NativeSelect id={ids.cook} name="cookMemberId" defaultValue="" className="w-full">
              <NativeSelectOption value="">정하지 않음</NativeSelectOption>
              {members.map((member) => (
                <NativeSelectOption key={member.id} value={member.id}>
                  {member.displayName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
        <SubmitButton pending={pending} pendingLabel="넣는 중…">
          넣기
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
