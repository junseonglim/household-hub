import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { CookingTabs } from '@/modules/cooking/components/cooking-tabs';
import { QuickAddForm } from '@/modules/cooking/shopping/components/quick-add-form';
import { ShoppingList } from '@/modules/cooking/shopping/components/shopping-list';
import { listOpenItems } from '@/modules/cooking/shopping/queries';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '장보기' };

export default async function ShoppingPage() {
  const ctx = await requireMember();
  const items = await listOpenItems(ctx);

  return (
    <>
      <PageHeader title="요리" description="장 볼 것을 함께 적고, 산 것은 체크해요." />
      <div className="mb-6">
        <CookingTabs current="shopping" />
      </div>
      <div className="mb-6 flex flex-col gap-3">
        <QuickAddForm />
        <Link
          href="/cooking/shopping/import"
          className={buttonVariants({ variant: 'outline', className: 'h-10 self-start' })}
        >
          <CalendarDays aria-hidden />
          식단에서 재료 가져오기
        </Link>
      </div>
      <ShoppingList items={items} />
    </>
  );
}
