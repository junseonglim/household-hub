import { SegmentedLinks } from '@/components/segmented-links';

/** 요리 화면 묶음: 식단 | 레시피 | 장보기 */
export function CookingTabs({ current }: { current: 'meals' | 'recipes' | 'shopping' }) {
  return (
    <SegmentedLinks
      label="요리 보기"
      links={[
        { href: '/cooking', label: '식단', active: current === 'meals' },
        { href: '/cooking/recipes', label: '레시피', active: current === 'recipes' },
        { href: '/cooking/shopping', label: '장보기', active: current === 'shopping' },
      ]}
    />
  );
}
