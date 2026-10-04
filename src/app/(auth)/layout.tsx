import { House } from 'lucide-react';

// 로그인 · 회원가입 · 승인 대기 화면 공통 (메뉴 없이 가운데 카드)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <House className="size-6" aria-hidden />
          </div>
          <p className="text-xl font-semibold">우리집</p>
        </div>
        {children}
      </div>
    </main>
  );
}
