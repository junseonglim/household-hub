import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentMembership, requireMember } from '@/modules/core/auth-context';
import { ChangePasswordForm } from '@/modules/core/auth/components/change-password-form';
import { ProfileForm } from '@/modules/core/household/components/profile-form';

export const metadata: Metadata = { title: '내 정보' };

export default async function ProfilePage() {
  const ctx = await requireMember();
  const current = await getCurrentMembership();

  return (
    <>
      <PageHeader title="내 정보" back={{ href: '/settings', label: '설정' }} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>{current?.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              name={current?.user.name ?? ''}
              displayName={ctx.displayName}
              color={ctx.color}
            />
          </CardContent>
        </Card>
        <Card id="password">
          <CardHeader>
            <CardTitle>비밀번호 바꾸기</CardTitle>
            <CardDescription>바꾸면 다른 기기에서는 다시 로그인해야 해요.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
