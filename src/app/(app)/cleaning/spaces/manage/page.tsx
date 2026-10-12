import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';
import { SpaceManager } from '@/modules/core/space/components/space-manager';
import { listSpaces } from '@/modules/core/space/queries';

export const metadata: Metadata = { title: '공간 편집' };

export default async function ManageSpacesPage() {
  const ctx = await requireMember();
  const back = { href: '/cleaning/spaces', label: '공간별' } as const;

  if (!canAdminister({ id: ctx.memberId, role: ctx.role })) {
    return (
      <>
        <PageHeader title="공간 편집" back={back} />
        <p className="text-sm text-muted-foreground">공간은 관리자만 바꿀 수 있어요.</p>
      </>
    );
  }

  const spaces = await listSpaces(ctx);
  return (
    <>
      <PageHeader
        title="공간 편집"
        description="이름 · 아이콘을 바꾸거나 순서를 정리해요. 아이콘은 이모지 하나를 넣어 주세요."
        back={back}
      />
      <SpaceManager spaces={spaces} />
    </>
  );
}
