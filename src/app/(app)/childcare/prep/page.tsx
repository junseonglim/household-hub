import type { Metadata } from 'next';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { listChildren, pickChild } from '@/modules/childcare/child/queries';
import { PrepProgressCard } from '@/modules/childcare/child/components/child-cards';
import { ChildcareNav, withChild } from '@/modules/childcare/components/childcare-tabs';
import { AddPrepDialog } from '@/modules/childcare/prep/components/add-prep-dialog';
import { PrepList } from '@/modules/childcare/prep/components/prep-list';
import { listPrepItems } from '@/modules/childcare/prep/queries';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '출산 준비' };

export default async function PrepPage({ searchParams }: PageProps<'/childcare/prep'>) {
  const ctx = await requireMember();
  const [children, items] = await Promise.all([listChildren(ctx), listPrepItems(ctx)]);
  const { child: childParam } = await searchParams;
  const child = pickChild(children, childParam);
  const childId = children.length > 1 ? (child?.id ?? null) : null;
  const done = items.filter((item) => item.isDone).length;

  return (
    <>
      <PageHeader title="육아" />
      <ChildcareNav current="prep" childList={children} selectedId={child?.id ?? null} />

      {items.length === 0 ? (
        <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <ListChecks className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="font-medium">출산 준비물을 함께 챙겨요</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            추천 목록에서 필요한 것만 골라 한 번에 등록하고, 산 것은 체크해서 겹치지 않게 해요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href={withChild('/childcare/prep/setup', childId)}
              className={buttonVariants({ className: 'h-10 px-4' })}
            >
              추천 준비물 고르기
            </Link>
            <AddPrepDialog />
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          <PrepProgressCard done={done} total={items.length} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={withChild('/childcare/prep/setup', childId)}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              추천 목록에서 더 고르기
            </Link>
            <AddPrepDialog />
          </div>
          <PrepList items={items} />
        </div>
      )}
    </>
  );
}
