'use client';

import { useId } from 'react';
import { ChoiceChip } from '@/components/form/choice-chip';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { TextField } from '@/components/form/text-field';
import { usePersistentFormAction } from '@/components/form/use-persistent-form-action';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { initialFormState, type FormState } from '@/lib/form-state';
import { RECIPE_TAG_PRESETS } from '../../constants';

export type RecipeFormInitial = {
  recipeId?: string;
  title: string;
  description: string;
  servings: string;
  cookMinutes: string;
  tags: string[];
  /** 한 줄에 재료 하나 ('양파 1개', '소금 약간') */
  ingredients: string;
  /** 한 줄에 한 단계 */
  steps: string;
  sourceUrl: string;
};

/** 레시피 등록 · 수정 (docs/modules/cooking.md 4.2절) */
export function RecipeForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: RecipeFormInitial;
  submitLabel: string;
}) {
  const ids = {
    servings: useId(),
    minutes: useId(),
    tags: useId(),
    ingredients: useId(),
    steps: useId(),
  };
  // 글상자 · 태그 선택이 많아서 오류가 나도 입력을 그대로 둔다
  const [state, formProps, pending] = usePersistentFormAction(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  const presetTags = RECIPE_TAG_PRESETS as readonly string[];
  const customTags = initial.tags.filter((tag) => !presetTags.includes(tag)).join(', ');

  return (
    <form {...formProps} noValidate className="flex flex-col gap-6">
      {initial.recipeId && <input type="hidden" name="recipeId" value={initial.recipeId} />}
      <FormMessage state={state} />
      <FieldGroup>
        <TextField
          label="요리 이름"
          name="title"
          placeholder="예: 된장찌개"
          maxLength={40}
          defaultValue={initial.title}
          error={errors.title}
        />
        <TextField
          label="한 줄 설명 (선택)"
          name="description"
          placeholder="예: 아이도 먹을 수 있게 덜 맵게"
          maxLength={200}
          defaultValue={initial.description}
          error={errors.description}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={errors.servings ? true : undefined}>
            <FieldLabel htmlFor={ids.servings}>기준 인분</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={ids.servings}
                name="servings"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                defaultValue={initial.servings}
                className="h-10 w-20"
              />
              <span className="text-sm">인분</span>
            </div>
            {errors.servings && <FieldError>{errors.servings}</FieldError>}
          </Field>
          <Field data-invalid={errors.cookMinutes ? true : undefined}>
            <FieldLabel htmlFor={ids.minutes}>조리 시간</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={ids.minutes}
                name="cookMinutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                defaultValue={initial.cookMinutes}
                className="h-10 w-20"
              />
              <span className="text-sm">분</span>
            </div>
            {errors.cookMinutes && <FieldError>{errors.cookMinutes}</FieldError>}
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">태그</legend>
          <div className="flex flex-wrap gap-2">
            {presetTags.map((tag) => (
              <ChoiceChip
                key={tag}
                type="checkbox"
                name="tags"
                value={tag}
                defaultChecked={initial.tags.includes(tag)}
              >
                {tag}
              </ChoiceChip>
            ))}
          </div>
          <Input
            id={ids.tags}
            name="customTags"
            aria-label="다른 태그"
            defaultValue={customTags}
            placeholder="다른 태그 (쉼표로 구분, 예: 여름, 캠핑)"
            className="h-10"
          />
          {errors.tags && <p className="text-sm text-destructive">{errors.tags}</p>}
        </fieldset>

        <Field data-invalid={errors.ingredients ? true : undefined}>
          <FieldLabel htmlFor={ids.ingredients}>재료</FieldLabel>
          <Textarea
            id={ids.ingredients}
            name="ingredients"
            rows={6}
            defaultValue={initial.ingredients}
            placeholder={'한 줄에 하나씩\n양파 1개\n돼지고기 앞다리 300g\n된장 2큰술\n소금 약간'}
          />
          <FieldDescription>
            “이름 양단위” 순서로 쓰면 장보기로 옮길 때 양을 합쳐 줘요. 메모는 괄호에: 마늘 3쪽 (다진
            것)
          </FieldDescription>
          {errors.ingredients && <FieldError>{errors.ingredients}</FieldError>}
        </Field>

        <Field data-invalid={errors.steps ? true : undefined}>
          <FieldLabel htmlFor={ids.steps}>조리 순서</FieldLabel>
          <Textarea
            id={ids.steps}
            name="steps"
            rows={6}
            defaultValue={initial.steps}
            placeholder={'한 줄에 한 단계씩\n멸치 육수를 낸다\n된장을 풀고 채소를 넣는다'}
          />
          {errors.steps && <FieldError>{errors.steps}</FieldError>}
        </Field>

        <TextField
          label="출처 주소 (선택)"
          name="sourceUrl"
          type="url"
          inputMode="url"
          placeholder="https://"
          defaultValue={initial.sourceUrl}
          error={errors.sourceUrl}
        />
      </FieldGroup>
      <SubmitButton className="h-11 self-start px-6" pending={pending} pendingLabel="저장하는 중…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
