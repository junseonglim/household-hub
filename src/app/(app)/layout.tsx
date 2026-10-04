import { AppBottomNav, AppSidebar } from '@/components/app-shell/app-nav';

// 로그인 + 승인된 구성원만 들어오는 영역. 인증 가드는 M1에서 추가한다.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <AppSidebar />
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
      <AppBottomNav />
    </div>
  );
}
