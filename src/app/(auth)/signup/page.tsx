import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { env } from '@/lib/env';
import { getSession } from '@/modules/core/auth-context';
import { SignupForm } from '@/modules/core/auth/components/signup-form';

export const metadata: Metadata = { title: '회원가입' };

export default async function SignupPage() {
  if (await getSession()) redirect('/');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">회원가입</CardTitle>
        <CardDescription>
          {env.SIGNUP_ENABLED
            ? '처음 가입하는 사람이 우리집 관리자가 돼요. 그다음부터는 관리자가 승인하면 함께 쓸 수 있어요.'
            : '지금은 새 가입을 받지 않아요. 가족 관리자에게 물어봐 주세요.'}
        </CardDescription>
      </CardHeader>
      {env.SIGNUP_ENABLED && (
        <CardContent>
          <SignupForm />
        </CardContent>
      )}
      <CardFooter className="justify-center gap-1 border-t py-4 text-sm text-muted-foreground">
        이미 계정이 있나요?
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          로그인
        </Link>
      </CardFooter>
    </Card>
  );
}
