import type { Metadata } from 'next';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { CleaningTabs } from '@/modules/cleaning/components/cleaning-nav';
import { SpaceCards } from '@/modules/cleaning/components/space-cards';
import { getSpaceSummaries } from '@/modules/cleaning/queries';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';

export const metadata: Metadata = { title: '공간별 청소' };

export default async function SpacesPage() {
  const ctx = await requireMember();
  const { today, summaries } = await getSpaceSummaries(ctx);

  return (
    <>
      <PageHeader title="청소" description="공간마다 할 일과 가장 오래 안 한 일을 봐요." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <CleaningTabs current="spaces" />
        {canAdminister({ id: ctx.memberId, role: ctx.role }) && (
          <Link
            href="/cleaning/spaces/manage"
            className={buttonVariants({ variant: 'outline', className: 'h-9' })}
          >
            <Settings2 aria-hidden />
            공간 편집
          </Link>
        )}
      </div>
      <SpaceCards summaries={summaries} today={today} timezone={ctx.timezone} />
    </>
  );
}
