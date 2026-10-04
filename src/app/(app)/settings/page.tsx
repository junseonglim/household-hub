import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { ChevronRight, UserRound, Users, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { requireMember } from '@/modules/core/auth-context';
import { SignOutButton } from '@/modules/core/auth/components/sign-out-button';
import { MemberAvatar } from '@/modules/core/household/components/member-avatar';
import { canAdminister, ROLE_LABELS } from '@/modules/core/household/permissions';
import { countPendingMembers } from '@/modules/core/household/queries';

export const metadata: Metadata = { title: '설정' };

export default async function SettingsPage() {
  const ctx = await requireMember();
  const pendingCount = canAdminister({ id: ctx.memberId, role: ctx.role })
    ? await countPendingMembers(ctx.householdId)
    : 0;

  return (
    <>
      <PageHeader title="설정" />
      <div className="mb-6 flex items-center gap-3 rounded-xl border p-4">
        <MemberAvatar
          displayName={ctx.displayName}
          color={ctx.color}
          className="size-11 text-base"
        />
        <div>
          <p className="font-medium">{ctx.displayName}</p>
          <p className="text-sm text-muted-foreground">
            {ctx.householdName} · {ROLE_LABELS[ctx.role]}
          </p>
        </div>
      </div>
      <ul className="mb-6 flex flex-col divide-y rounded-xl border">
        <SettingsLink
          href="/settings/profile"
          icon={UserRound}
          title="내 정보"
          description="이름, 호칭, 색, 비밀번호"
        />
        <SettingsLink
          href="/settings/household"
          icon={Users}
          title="우리집 구성원"
          description="가족 목록, 가입 승인"
          badge={pendingCount > 0 ? `승인 대기 ${pendingCount}` : undefined}
        />
      </ul>
      <SignOutButton className="h-11 w-full" />
    </>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: Route;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted-foreground">{description}</span>
        </span>
        {badge && <Badge variant="destructive">{badge}</Badge>}
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
