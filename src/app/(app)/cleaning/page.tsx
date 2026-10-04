import type { Metadata } from 'next';
import { SprayCan } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: '청소' };

export default function CleaningPage() {
  return (
    <>
      <PageHeader title="청소" description="반복되는 청소와 정리 일을 함께 챙겨요." />
      <EmptyState
        icon={SprayCan}
        title="곧 만들어질 화면이에요"
        description="오늘 할 일, 밀린 일, 공간별 청소 기록이 여기에 표시됩니다."
      />
    </>
  );
}
