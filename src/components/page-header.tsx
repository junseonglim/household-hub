import type { Route } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  description?: string;
  /** 상위 화면으로 돌아가는 링크 (예: 설정 > 내 정보) */
  back?: { href: Route; label: string };
};

export function PageHeader({ title, description, back }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2 -ml-1 inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </header>
  );
}
