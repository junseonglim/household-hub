import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ConfirmActionButton } from '@/components/form/confirm-action-button';
import { PageHeader } from '@/components/page-header';
import { todayIn } from '@/lib/local-date';
import { archiveChildAction } from '@/modules/childcare/child/actions';
import { EditChildForm } from '@/modules/childcare/child/components/child-forms';
import { getChild } from '@/modules/childcare/child/queries';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';

export const metadata: Metadata = { title: '아이 정보' };

export default async function EditChildPage({ params }: PageProps<'/childcare/child/[id]'>) {
  const ctx = await requireMember();
  if (!canAdminister({ id: ctx.memberId, role: ctx.role })) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const child = await getChild(ctx, id);
  if (!child) notFound();

  return (
    <>
      <PageHeader
        title="아이 정보"
        back={{ href: `/childcare?child=${child.id}` as Route, label: '육아' }}
      />
      <EditChildForm child={child} today={todayIn(ctx.timezone)} />
      <section className="mt-10 border-t pt-6">
        <h2 className="mb-1 font-semibold">보관</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          잘못 등록한 아이를 육아 화면에서 숨겨요. 기록은 지우지 않아요.
        </p>
        <ConfirmActionButton
          action={archiveChildAction}
          fields={{ childId: child.id }}
          triggerLabel="이 아이 보관"
          title={`${child.name}을(를) 보관할까요?`}
          description="육아 화면 · 일정에서 보이지 않게 돼요."
          confirmLabel="보관"
          destructive
        />
      </section>
    </>
  );
}
