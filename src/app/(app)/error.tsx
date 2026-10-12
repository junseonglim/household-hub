'use client';

import { CircleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/** 예상하지 못한 오류 (docs/03-architecture.md 9절). 자세한 내용은 서버 로그에 남는다. */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <CircleAlert className="mb-4 size-8 text-destructive" aria-hidden />
      <h1 className="font-semibold">문제가 생겼어요</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        잠시 뒤에 다시 시도해 주세요. 계속되면 화면을 새로 고쳐 주세요.
      </p>
      <Button onClick={retry} className="mt-6 h-10 px-4">
        다시 시도
      </Button>
    </section>
  );
}
