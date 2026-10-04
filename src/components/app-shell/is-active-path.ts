/**
 * 메뉴 항목이 현재 경로에 해당하는지 판단한다.
 * '/cleaning'은 '/cleaning', '/cleaning/tasks/1'과 맞고 '/cleaning-old'와는 맞지 않는다.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
