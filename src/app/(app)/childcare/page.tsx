import type { Metadata } from 'next';
import { Baby } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: '육아' };

// 틀만 둔 화면. 출산 시기에 신생아 기준으로 상세 설계한다 (docs/modules/childcare.md).
export default function ChildcarePage() {
  return (
    <>
      <PageHeader title="육아" />
      <EmptyState
        icon={Baby}
        badge="준비 중"
        title="아기를 기다리고 있어요"
        description="육아 기능은 출산 시기에 맞춰 준비할게요."
      />
    </>
  );
}
