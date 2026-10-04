import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireMember } from '@/modules/core/auth-context';
import { HouseholdNameForm } from '@/modules/core/household/components/household-name-form';
import { MemberRow } from '@/modules/core/household/components/member-row';
import { PendingMemberCard } from '@/modules/core/household/components/pending-member-card';
import {
  canAdminister,
  canManageMember,
  canResetPassword,
} from '@/modules/core/household/permissions';
import { listMembers } from '@/modules/core/household/queries';

export const metadata: Metadata = { title: '우리집 구성원' };

export default async function HouseholdPage() {
  const ctx = await requireMember();
  const actor = { id: ctx.memberId, role: ctx.role };
  const isAdmin = canAdminister(actor);
  const members = await listMembers(ctx);
  const active = members.filter((member) => member.status === 'active');
  const pending = isAdmin ? members.filter((member) => member.status === 'pending') : [];

  const formatJoined = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ctx.timezone,
  });

  return (
    <>
      <PageHeader title="우리집 구성원" back={{ href: '/settings', label: '설정' }} />
      <div className="flex flex-col gap-6">
        {isAdmin ? (
          <Card>
            <CardContent>
              <HouseholdNameForm name={ctx.householdName} />
            </CardContent>
          </Card>
        ) : null}

        {pending.length > 0 && (
          <section aria-labelledby="pending-heading" className="flex flex-col gap-3">
            <h2 id="pending-heading" className="font-semibold">
              가입 승인 대기 {pending.length}명
            </h2>
            <p className="-mt-2 text-sm text-muted-foreground">
              가족이 맞는지 이름과 이메일을 확인하고 승인해 주세요.
            </p>
            {pending.map((member) => (
              <PendingMemberCard
                key={member.id}
                member={{ ...member, joinedLabel: formatJoined.format(member.createdAt) }}
              />
            ))}
          </section>
        )}

        <Card>
          <CardHeader>
            <CardTitle>구성원 {active.length}명</CardTitle>
            <CardDescription>
              {isAdmin
                ? '역할을 바꾸거나, 비밀번호를 잊은 가족에게 임시 비밀번호를 만들어 줄 수 있어요.'
                : `${ctx.householdName}에서 함께하는 가족이에요.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="-my-4 divide-y">
              {active.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  canManage={canManageMember(actor, member)}
                  canResetPassword={canResetPassword(actor, member)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
