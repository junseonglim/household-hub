import type { Metadata } from 'next';
import { Settings } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: '설정' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" />
      <EmptyState
        icon={Settings}
        title="곧 만들어질 화면이에요"
        description="내 정보, 구성원 관리, 가입 승인이 여기에 표시됩니다."
      />
    </>
  );
}
