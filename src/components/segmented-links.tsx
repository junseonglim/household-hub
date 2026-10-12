import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type SegmentedLink = { href: Route; label: string; active: boolean };

/** 두세 개 중 하나를 고르는 링크 묶음 (예: 할 일 | 공간별, 전체 | 내 담당) */
export function SegmentedLinks({ label, links }: { label: string; links: SegmentedLink[] }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-lg bg-muted p-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.active ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors',
            link.active && 'bg-background font-medium text-foreground shadow-sm',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
