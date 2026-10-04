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
import { safeRedirectPath } from '@/lib/safe-redirect';
import { getSession } from '@/modules/core/auth-context';
import { LoginForm } from '@/modules/core/auth/components/login-form';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await getSession()) redirect('/');

  const { next } = await searchParams;
  const nextPath = typeof next === 'string' ? safeRedirectPath(next, '') : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">로그인</CardTitle>
        <CardDescription>우리 가족 집안일을 함께 챙겨요.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={nextPath || undefined} />
      </CardContent>
      <CardFooter className="justify-center gap-1 border-t py-4 text-sm text-muted-foreground">
        처음이신가요?
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          회원가입
        </Link>
      </CardFooter>
    </Card>
  );
}
