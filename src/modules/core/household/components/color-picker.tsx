import { MEMBER_COLOR_NAMES, MEMBER_COLORS } from '../constants';

/** 구성원 색 고르기 (라디오 버튼). 폼에는 name="color"로 들어간다. */
export function ColorPicker({
  defaultValue,
  label = '색',
}: {
  defaultValue?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
      {MEMBER_COLORS.map((color) => (
        <label key={color} className="cursor-pointer">
          <input
            type="radio"
            name="color"
            value={color}
            defaultChecked={color === defaultValue}
            aria-label={MEMBER_COLOR_NAMES[color]}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="block size-8 rounded-full ring-offset-2 ring-offset-background transition peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            style={{ backgroundColor: color }}
          />
        </label>
      ))}
    </div>
  );
}
