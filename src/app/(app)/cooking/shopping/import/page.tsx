import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDays, formatShortDate, isValidLocalDate, startOfWeek, todayIn } from '@/lib/local-date';
import { ImportForm } from '@/modules/cooking/shopping/components/import-form';
import { getImportPreview } from '@/modules/cooking/shopping/queries';
import { requireMember } from '@/modules/core/auth-context';

export const metadata: Metadata = { title: '식단에서 재료 가져오기' };

/** 너무 긴 기간은 한 번에 가져오지 않는다 */
const MAX_DAYS = 31;

export default async function ImportPage({ searchParams }: PageProps<'/cooking/shopping/import'>) {
  const ctx = await requireMember();
  const params = await searchParams;
  const today = todayIn(ctx.timezone);
  // 기본: 오늘 ~ 이번 주 일요일
  const from =
    typeof params.from === 'string' && isValidLocalDate(params.from) ? params.from : today;
  let to =
    typeof params.to === 'string' && isValidLocalDate(params.to)
      ? params.to
      : addDays(startOfWeek(today), 6);
  if (to < from) to = from;
  if (to > addDays(from, MAX_DAYS - 1)) to = addDays(from, MAX_DAYS - 1);

  const { candidates, menusWithoutRecipe } = await getImportPreview(ctx, { from, to });

  return (
    <>
      <PageHeader
        title="식단에서 재료 가져오기"
        description="기간 안 집밥 메뉴의 레시피 재료를 모아요. 같은 재료는 양을 합쳐요."
        back={{ href: '/cooking/shopping', label: '장보기' }}
      />
      <form action="/cooking/shopping/import" className="mb-6 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          시작
          <Input type="date" name="from" defaultValue={from} className="h-10 w-40" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          끝
          <Input type="date" name="to" defaultValue={to} className="h-10 w-40" />
        </label>
        <Button type="submit" variant="outline" className="h-10">
          다시 보기
        </Button>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {formatShortDate(from)} ~ {formatShortDate(to)} 식단
      </p>
      {candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          이 기간 식단에 레시피 재료가 없어요.{' '}
          <Link href="/cooking" className="underline underline-offset-4">
            식단 짜러 가기
          </Link>
        </p>
      ) : (
        <ImportForm key={`${from}~${to}`} from={from} to={to} candidates={candidates} />
      )}
      {menusWithoutRecipe.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          레시피 없이 이름만 적은 메뉴는 재료를 알 수 없어서 빠졌어요:{' '}
          {menusWithoutRecipe.join(', ')}
        </p>
      )}
    </>
  );
}
