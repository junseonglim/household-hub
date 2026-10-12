import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { todayIn } from '@/lib/local-date';
import { RegisterChildForm } from '@/modules/childcare/child/components/child-forms';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';

export const metadata: Metadata = { title: '아이 등록' };

/** 아이 한 명 더 (첫 아이는 육아 화면에서 바로 등록한다) */
export default async function NewChildPage() {
  const ctx = await requireMember();
  if (!canAdminister({ id: ctx.memberId, role: ctx.role })) notFound();

  return (
    <>
      <PageHeader
        title="아이 등록"
        description="아이가 둘 이상이면 육아 화면 위쪽에서 아이를 골라 볼 수 있어요."
        back={{ href: '/childcare', label: '육아' }}
      />
      <RegisterChildForm today={todayIn(ctx.timezone)} />
    </>
  );
}
