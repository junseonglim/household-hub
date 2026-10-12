import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { todayIn } from '@/lib/local-date';
import { SetupForm, type SetupItem } from '@/modules/cleaning/components/setup-form';
import { listCleaningTaskTitles } from '@/modules/cleaning/queries';
import { CLEANING_TEMPLATES } from '@/modules/cleaning/templates';
import { requireMember } from '@/modules/core/auth-context';
import { listSpaces } from '@/modules/core/space/queries';

export const metadata: Metadata = { title: '추천 할 일' };

export default async function SetupPage() {
  const ctx = await requireMember();
  const [spaces, existingTitles] = await Promise.all([
    listSpaces(ctx),
    listCleaningTaskTitles(ctx),
  ]);
  const items: SetupItem[] = CLEANING_TEMPLATES.map((template) => ({
    ...template,
    spaceId: spaces.find((space) => space.name === template.spaceName)?.id ?? null,
    exists: existingTitles.has(template.title),
  }));

  return (
    <>
      <PageHeader
        title="추천 할 일"
        description="우리 집에 필요한 것만 골라 한 번에 등록해요. 반복과 공간은 나중에도 바꿀 수 있어요."
        back={{ href: '/cleaning', label: '청소' }}
      />
      <SetupForm items={items} spaces={spaces} today={todayIn(ctx.timezone)} />
    </>
  );
}
