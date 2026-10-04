'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isActivePath } from './is-active-path';
import { navItems } from './nav-items';

/** PC(md 이상): 왼쪽 사이드바 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-sidebar px-3 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-3 text-lg font-semibold">
        <House className="size-5" aria-hidden />
        우리집
      </Link>
      <nav aria-label="주 메뉴" className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** 휴대폰(md 미만): 하단 탭 */
export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors',
                  active && 'font-medium text-foreground',
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
