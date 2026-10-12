import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { todayIn } from '@/lib/local-date';
import { BornForm } from '@/modules/childcare/child/components/child-forms';
import { getChild } from '@/modules/childcare/child/queries';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';

export const metadata: Metadata = { title: '태어났어요' };

export default async function BornPage({ params }: PageProps<'/childcare/child/[id]/born'>) {
  const ctx = await requireMember();
  if (!canAdminister({ id: ctx.memberId, role: ctx.role })) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const child = await getChild(ctx, id);
  if (!child) notFound();
  const home = `/childcare?child=${child.id}` as Route;
  if (child.birthDate) redirect(home);

  return (
    <>
      <PageHeader
        title="태어났어요 🎉"
        description="축하해요! 생년월일을 넣으면 예방접종 · 영유아 검진 · 출생신고 일정을 만들어 드려요."
        back={{ href: home, label: '육아' }}
      />
      <BornForm child={child} today={todayIn(ctx.timezone)} />
    </>
  );
}
