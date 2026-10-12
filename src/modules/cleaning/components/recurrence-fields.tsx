'use client';

import { useId, useState } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import {
  formatShortDate,
  isValidLocalDate,
  WEEKDAY_LABELS,
  type LocalDate,
} from '@/lib/local-date';
import {
  RECURRENCE_TYPE_LABELS,
  RECURRENCE_TYPES,
  upcomingDueDates,
  type Recurrence,
  type RecurrenceType,
  type Weekday,
} from '@/modules/core/task/recurrence';
import { RECURRENCE_FIELDS } from '../form-fields';

/**
 * 라디오 · 체크박스를 칩 모양으로. 투명한 입력 요소가 칩 전체를 덮어서 탭 · 키보드 · 화면 낭독기가
 * 그대로 입력 요소를 다룬다. 보이는 모양은 바로 뒤의 칩(span)이 peer-checked로 그린다.
 */
export const chipLabelClassName = 'relative inline-flex cursor-pointer';
export const chipInputClassName = 'peer absolute inset-0 size-full cursor-pointer opacity-0';
export const chipClassName =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50';

type RecurrenceFieldsProps = {
  /** 한 폼에 여러 개를 둘 때 칸 이름 앞에 붙인다 (처음 설정 화면) */
  namePrefix?: string;
  defaultValue: Recurrence;
  /** 미리보기의 첫 예정일 (등록 · 수정 · 처음 설정마다 계산 방법이 다르다) */
  firstDueOf: (rule: Recurrence) => LocalDate | null;
  /** 칸 이름(접두어 포함)별 오류 */
  errors?: Partial<Record<string, string>>;
  onTypeChange?: (type: RecurrenceType) => void;
  /** 바뀔 때마다 규칙 설명을 알려 준다 (규칙이 아직 완성되지 않았으면 null) */
  onRuleChange?: (rule: Recurrence | null) => void;
};

/** 반복 고르기: 한 번만 / 매일 / 매주(요일) / 매월(날짜) / N일마다 + 다음 예정일 미리보기 */
export function RecurrenceFields({
  namePrefix = '',
  defaultValue,
  firstDueOf,
  errors = {},
  onTypeChange,
  onRuleChange,
}: RecurrenceFieldsProps) {
  const id = useId();
  const name = (field: string) => namePrefix + field;
  const [type, setType] = useState<RecurrenceType>(defaultValue.type);
  const [weekdays, setWeekdays] = useState<Weekday[]>(
    defaultValue.type === 'weekly' ? defaultValue.weekdays : [],
  );
  const [monthDay, setMonthDay] = useState(
    String(defaultValue.type === 'monthly' ? defaultValue.day : 1),
  );
  const [everyDays, setEveryDays] = useState(
    String(defaultValue.type === 'every_n_days' ? defaultValue.days : 7),
  );
  const [dueDate, setDueDate] = useState(
    defaultValue.type === 'once' ? (defaultValue.dueDate ?? '') : '',
  );

  const rule = currentRule({ type, weekdays, monthDay, everyDays, dueDate });
  const update = (next: Partial<Parameters<typeof currentRule>[0]>) =>
    onRuleChange?.(currentRule({ type, weekdays, monthDay, everyDays, dueDate, ...next }));

  const error = (field: string) => errors[name(field)];

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">반복</legend>
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_TYPES.map((option) => (
            <label key={option} className={chipLabelClassName}>
              <input
                type="radio"
                name={name(RECURRENCE_FIELDS.type)}
                value={option}
                checked={type === option}
                onChange={() => {
                  setType(option);
                  onTypeChange?.(option);
                  update({ type: option });
                }}
                className={chipInputClassName}
              />
              <span className={chipClassName}>{RECURRENCE_TYPE_LABELS[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === 'weekly' && (
        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={error(RECURRENCE_FIELDS.weekdays) ? `${id}-weekdays-error` : undefined}
        >
          <legend className="mb-2 text-sm font-medium">요일</legend>
          <input type="hidden" name={name(RECURRENCE_FIELDS.weekdays)} value={weekdays.join(',')} />
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => (
              <label key={label} className={chipLabelClassName}>
                <input
                  type="checkbox"
                  checked={weekdays.includes(day as Weekday)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...weekdays, day as Weekday].sort((a, b) => a - b)
                      : weekdays.filter((selected) => selected !== day);
                    setWeekdays(next);
                    update({ weekdays: next });
                  }}
                  className={chipInputClassName}
                />
                <span className={cn(chipClassName, 'px-0')}>{label}</span>
              </label>
            ))}
          </div>
          {error(RECURRENCE_FIELDS.weekdays) && (
            <p id={`${id}-weekdays-error`} className="text-sm text-destructive">
              {error(RECURRENCE_FIELDS.weekdays)}
            </p>
          )}
        </fieldset>
      )}

      {type === 'monthly' && (
        <Field data-invalid={error(RECURRENCE_FIELDS.monthDay) ? true : undefined}>
          <FieldLabel htmlFor={`${id}-month-day`}>매월 며칠</FieldLabel>
          <div>
            <NativeSelect
              id={`${id}-month-day`}
              name={name(RECURRENCE_FIELDS.monthDay)}
              value={monthDay}
              onChange={(event) => {
                setMonthDay(event.target.value);
                update({ monthDay: event.target.value });
              }}
              className="w-40"
            >
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <NativeSelectOption key={day} value={day}>
                  {day === 31 ? '말일' : `${day}일`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <FieldDescription>그 날짜가 없는 달(예: 2월 30일)은 말일에 해요.</FieldDescription>
          {error(RECURRENCE_FIELDS.monthDay) && (
            <FieldError>{error(RECURRENCE_FIELDS.monthDay)}</FieldError>
          )}
        </Field>
      )}

      {type === 'every_n_days' && (
        <Field data-invalid={error(RECURRENCE_FIELDS.everyDays) ? true : undefined}>
          <FieldLabel htmlFor={`${id}-every-days`}>며칠마다</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-every-days`}
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              name={name(RECURRENCE_FIELDS.everyDays)}
              value={everyDays}
              onChange={(event) => {
                setEveryDays(event.target.value);
                update({ everyDays: event.target.value });
              }}
              aria-invalid={error(RECURRENCE_FIELDS.everyDays) ? true : undefined}
              className="h-10 w-24"
            />
            <span className="text-sm">일마다</span>
          </div>
          <FieldDescription>
            완료한 날부터 다시 세요. 늦게 하면 다음 차례도 늦춰져요.
          </FieldDescription>
          {error(RECURRENCE_FIELDS.everyDays) && (
            <FieldError>{error(RECURRENCE_FIELDS.everyDays)}</FieldError>
          )}
        </Field>
      )}

      {type === 'once' && (
        <Field data-invalid={error(RECURRENCE_FIELDS.dueDate) ? true : undefined}>
          <FieldLabel htmlFor={`${id}-due-date`}>기한 (선택)</FieldLabel>
          <div>
            <Input
              id={`${id}-due-date`}
              type="date"
              name={name(RECURRENCE_FIELDS.dueDate)}
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value);
                update({ dueDate: event.target.value });
              }}
              aria-invalid={error(RECURRENCE_FIELDS.dueDate) ? true : undefined}
              className="h-10 w-44"
            />
          </div>
          {error(RECURRENCE_FIELDS.dueDate) && (
            <FieldError>{error(RECURRENCE_FIELDS.dueDate)}</FieldError>
          )}
        </Field>
      )}

      <UpcomingPreview rule={rule} firstDueOf={firstDueOf} />
    </div>
  );
}

type RuleState = {
  type: RecurrenceType;
  weekdays: Weekday[];
  monthDay: string;
  everyDays: string;
  dueDate: string;
};

/** 입력 중인 값으로 규칙을 만든다. 아직 완성되지 않았으면 null */
function currentRule(state: RuleState): Recurrence | null {
  switch (state.type) {
    case 'once':
      return { type: 'once', dueDate: isValidLocalDate(state.dueDate) ? state.dueDate : null };
    case 'daily':
      return { type: 'daily' };
    case 'weekly':
      return state.weekdays.length > 0 ? { type: 'weekly', weekdays: state.weekdays } : null;
    case 'monthly':
      return { type: 'monthly', day: Number(state.monthDay) };
    case 'every_n_days': {
      const days = Number(state.everyDays);
      return Number.isInteger(days) && days >= 1 && days <= 365
        ? { type: 'every_n_days', days }
        : null;
    }
  }
}

function UpcomingPreview({
  rule,
  firstDueOf,
}: {
  rule: Recurrence | null;
  firstDueOf: (rule: Recurrence) => LocalDate | null;
}) {
  if (!rule) return null;
  const dates = upcomingDueDates(rule, firstDueOf(rule), 3);
  const text =
    dates.length === 0
      ? '기한 없이 목록에 남아 있다가, 완료하면 사라져요.'
      : `다음 예정일: ${dates.map(formatShortDate).join(', ')}`;
  return (
    <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground" aria-live="polite">
      {text}
    </p>
  );
}
