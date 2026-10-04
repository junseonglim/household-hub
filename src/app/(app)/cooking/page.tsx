import type { Metadata } from 'next';
import { CookingPot } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: '요리' };

export default function CookingPage() {
  return (
    <>
      <PageHeader title="요리" description="한 주 식단을 함께 짜고 장보기 목록을 나눠요." />
      <EmptyState
        icon={CookingPot}
        title="곧 만들어질 화면이에요"
        description="이번 주 식단, 레시피, 장보기 목록이 여기에 표시됩니다."
      />
    </>
  );
}
