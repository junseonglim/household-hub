import type { Route } from 'next';
import { SegmentedLinks } from '@/components/segmented-links';

export function CleaningTabs({ current }: { current: 'tasks' | 'spaces' }) {
  return (
    <SegmentedLinks
      label="청소 보기"
      links={[
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
      links={[
        { href: '/cleaning', label: '전체', active: !mine },
        { href: '/cleaning?view=mine' as Route, label: '내 담당', active: mine },
      ]}
    />
  );
}
