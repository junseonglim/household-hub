import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { withChild } from '@/modules/childcare/components/childcare-tabs';
import {
  PrepSetupForm,
  type PrepSetupItem,
} from '@/modules/childcare/prep/components/prep-setup-form';
import { listPrepItems } from '@/modules/childcare/prep/queries';
import { PREP_TEMPLATES } from '@/modules/childcare/prep/templates';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '추천 준비물' };

const normalize = (title: string) => title.replace(/\s+/g, '').toLowerCase();

export default async function PrepSetupPage({ searchParams }: PageProps<'/childcare/prep/setup'>) {
  const ctx = await requireMember();
  const { child } = await searchParams;
  const existing = new Set((await listPrepItems(ctx)).map((item) => normalize(item.title)));
  const items: PrepSetupItem[] = PREP_TEMPLATES.map((template) => ({
    ...template,
    exists: existing.has(normalize(template.title)),
  }));

  return (
    <>
      <PageHeader
        title="추천 준비물"
        description="필요한 것만 골라 한 번에 등록해요. 수량 · 메모는 등록한 뒤에 고칠 수 있어요."
        back={{
          href: withChild('/childcare/prep', typeof child === 'string' ? child : null),
          label: '준비',
        }}
      />
      <PrepSetupForm items={items} />
    </>
  );
}
