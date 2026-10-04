import type { Route } from 'next';
import { Baby, CookingPot, Settings, SprayCan, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

// 대시보드가 생기면 맨 앞에 '홈'을 추가한다.
export const navItems: NavItem[] = [
  { href: '/cleaning', label: '청소', icon: SprayCan },
  { href: '/cooking', label: '요리', icon: CookingPot },
  { href: '/childcare', label: '육아', icon: Baby },
  { href: '/settings', label: '설정', icon: Settings },
];
