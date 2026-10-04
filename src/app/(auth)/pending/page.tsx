import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentMembership } from '@/modules/core/auth-context';
import { SignOutButton } from '@/modules/core/auth/components/sign-out-button';

export const metadata: Metadata = { title: '승인 대기' };

export default async function PendingPage() {
  const current = await getCurrentMembership();
  if (!current) redirect('/login');
  if (current.member.status === 'active') redirect('/');

  const removed = current.member.status === 'removed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {removed ? '사용할 수 없는 계정이에요' : '관리자 승인을 기다리고 있어요'}
        </CardTitle>
        <CardDescription>
          {removed
            ? `${current.household.name}에서 내보낸 계정이에요. 다시 쓰려면 가족 관리자에게 물어봐 주세요.`
            : `${current.user.name}님, 가입했어요! ${current.household.name} 관리자가 승인하면 바로 쓸 수 있어요.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!removed && (
          <Link href="/" className={buttonVariants({ className: 'h-11 w-full' })}>
            승인됐는지 확인하기
          </Link>
        )}
        <SignOutButton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}
