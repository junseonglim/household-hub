import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Tab = { href: Route; label: string; active: boolean };

/** 두세 개 중 하나를 고르는 링크 묶음 (할 일 | 공간별, 전체 | 내 담당) */
function SegmentedLinks({ label, tabs }: { label: string; tabs: Tab[] }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors',
            tab.active && 'bg-background font-medium text-foreground shadow-sm',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function CleaningTabs({ current }: { current: 'tasks' | 'spaces' }) {
  return (
    <SegmentedLinks
      label="청소 보기"
      tabs={[
        { href: '/cleaning', label: '할 일', active: current === 'tasks' },
        { href: '/cleaning/spaces', label: '공간별', active: current === 'spaces' },
      ]}
    />
  );
}

export function MineFilter({ mine }: { mine: boolean }) {
  return (
    <SegmentedLinks
      label="담당 걸러 보기"
      tabs={[
        { href: '/cleaning', label: '전체', active: !mine },
        { href: '/cleaning?view=mine' as Route, label: '내 담당', active: mine },
      ]}
    />
  );
}
