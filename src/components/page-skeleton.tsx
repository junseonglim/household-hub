import { cn } from '@/lib/utils';

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/**
 * 화면을 불러오는 동안 바로 보여 주는 뼈대 (각 메뉴의 loading.tsx). 제목을 알면 제목은 바로 보여 준다.
 * 화면은 모두 로그인 확인이 필요한 동적 화면이라, loading.tsx가 있어야 누르자마자 반응하고
 * 링크를 미리 불러올 수 있다 (Next.js: 동적 화면은 loading.js가 없으면 미리 불러오지 않는다).
 */
export function PageSkeleton({ title, tabs = 0 }: { title?: string; tabs?: number }) {
  return (
    <div aria-busy="true">
      <header className="mb-6">
        {title ? (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        ) : (
          <Bone className="h-8 w-28" />
        )}
      </header>
      <p className="sr-only" role="status">
        불러오는 중…
      </p>
      {tabs > 0 && (
        <div aria-hidden className="mb-6 flex w-fit gap-1 rounded-lg bg-muted p-1">
          {Array.from({ length: tabs }, (_, index) => (
            <div key={index} className="h-7 w-14 rounded-md bg-background/60" />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3">
        <Bone className="h-28 rounded-xl" />
        <Bone className="h-16 rounded-xl" />
        <Bone className="h-16 rounded-xl" />
        <Bone className="h-16 rounded-xl" />
      </div>
    </div>
  );
}
