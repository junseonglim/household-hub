import { AppNotices } from '@/components/app-shell/app-notices';
import { AppBottomNav, AppSidebar } from '@/components/app-shell/app-nav';
import { requireMember } from '@/modules/core/auth-context';
import { canAdminister } from '@/modules/core/household/permissions';
import { countPendingMembers } from '@/modules/core/household/queries';

// 로그인 + 승인된 구성원만 들어오는 영역 (docs/03-architecture.md 5절의 두 번째 검사)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMember();
  const pendingCount = canAdminister({ id: ctx.memberId, role: ctx.role })
    ? await countPendingMembers(ctx.householdId)
    : 0;
  const badges = { '/settings': pendingCount };

  return (
    <div className="min-h-dvh md:flex">
      <AppSidebar householdName={ctx.householdName} badges={badges} />
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
          <AppNotices mustChangePassword={ctx.mustChangePassword} pendingCount={pendingCount} />
          {children}
        </div>
      </main>
      <AppBottomNav badges={badges} />
    </div>
  );
}
