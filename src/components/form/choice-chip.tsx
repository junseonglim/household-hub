import { cn } from '@/lib/utils';

type ChoiceChipProps = Omit<React.ComponentProps<'input'>, 'type' | 'className'> & {
  type?: 'radio' | 'checkbox';
  /** 칩(보이는 부분)에 더할 클래스 */
  chipClassName?: string;
};

/**
 * 라디오 · 체크박스를 칩 모양으로. 투명한 입력 요소가 칩 전체를 덮어서 탭 · 키보드 · 화면 낭독기가
 * 그대로 입력 요소를 다룬다. 보이는 모양은 바로 뒤의 칩(span)이 peer-checked로 그린다.
 */
export function ChoiceChip({
  type = 'radio',
  chipClassName,
  children,
  ...inputProps
}: ChoiceChipProps) {
  return (
    <label className="relative inline-flex cursor-pointer">
      <input
        type={type}
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
        {...inputProps}
      />
      <span
        className={cn(
          'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50',
          chipClassName,
        )}
      >
        {children}
      </span>
    </label>
  );
}
