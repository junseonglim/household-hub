import { cn } from '@/lib/utils';

/** 구성원 색 동그라미 + 호칭 첫 글자 */
export function MemberAvatar({
  displayName,
  color,
  className,
}: {
  displayName: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {Array.from(displayName)[0] ?? '?'}
    </span>
  );
}
