import { useId } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type TextFieldProps = Omit<React.ComponentProps<typeof Input>, 'id'> & {
  label: string;
  name: string;
  description?: string;
  error?: string;
};

/** 라벨 · 설명 · 오류 문구가 붙은 입력 칸 */
export function TextField({
  label,
  name,
  description,
  error,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [description && descriptionId, error && errorId].filter(Boolean).join(' ') || undefined
        }
        className={className ?? 'h-10'}
        {...props}
      />
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
