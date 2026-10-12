import type { Route } from 'next';
import Link from 'next/link';
import { SegmentedLinks } from '@/components/segmented-links';
import { cn } from '@/lib/utils';
import type { ChildItem } from '../child/queries';

/** 아이가 둘 이상일 때 고른 아이를 주소에 남긴다 */
export const withChild = (href: string, childId?: string | null) =>
  (childId ? `${href}${href.includes('?') ? '&' : '?'}child=${childId}` : href) as Route;

/** 육아 화면 묶음: 오늘 | 일정 | 준비 (성장은 M4-2) */
export function ChildcareTabs({
  current,
  childId,
}: {
  current: 'today' | 'schedule' | 'prep';
  childId?: string | null;
}) {
  return (
    <SegmentedLinks
      label="육아 보기"
      links={[
        { href: withChild('/childcare', childId), label: '오늘', active: current === 'today' },
        {
          href: withChild('/childcare/schedule', childId),
          label: '일정',
          active: current === 'schedule',
        },
        { href: withChild('/childcare/prep', childId), label: '준비', active: current === 'prep' },
      ]}
    />
  );
}

/** 아이 고르기 칩 (둘 이상일 때만) */
export function ChildPicker({
  childList,
  selectedId,
  basePath,
}: {
  childList: ChildItem[];
  selectedId: string;
  basePath: '/childcare' | '/childcare/schedule' | '/childcare/prep';
}) {
  if (childList.length < 2) return null;
  return (
    <nav aria-label="아이 고르기" className="flex flex-wrap gap-2">
      {childList.map((item) => (
        <Link
          key={item.id}
          href={withChild(basePath, item.id)}
          aria-current={item.id === selectedId ? 'page' : undefined}
          className={cn(
            'inline-flex h-9 items-center rounded-full border px-3 text-sm transition-colors',
            item.id === selectedId && 'border-primary bg-primary text-primary-foreground',
          )}
        >
          {item.birthDate ? '👶' : '🤰'} {item.name}
        </Link>
      ))}
    </nav>
  );
}

/** 탭 · 아이 고르기를 한 줄로 */
export function ChildcareNav({
  current,
  childList,
  selectedId,
}: {
  current: 'today' | 'schedule' | 'prep';
  childList: ChildItem[];
  selectedId: string | null;
}) {
  const basePath = (
    { today: '/childcare', schedule: '/childcare/schedule', prep: '/childcare/prep' } as const
  )[current];
  // 아이가 하나면 주소에 남길 필요가 없다
  const childId = childList.length > 1 ? selectedId : null;
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div>
        <ChildcareTabs current={current} childId={childId} />
      </div>
      {selectedId && (
        <ChildPicker childList={childList} selectedId={selectedId} basePath={basePath} />
      )}
    </div>
  );
}
