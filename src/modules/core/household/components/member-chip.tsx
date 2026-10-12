import { cn } from '@/lib/utils';

/** 담당자 · 완료한 사람 표시: 구성원 색 점 + 호칭. 사람이 없으면 '누구나' */
export function MemberChip({
  member,
  className,
}: {
  member: { displayName: string; color: string } | null;
  className?: string;
}) {
  if (!member) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground',
          className,
        )}
      >
        누구나
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: member.color }} />
      {member.displayName}
    </span>
  );
}
