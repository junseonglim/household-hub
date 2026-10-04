import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { isRole } from './household/permissions';
import { ensureMembership } from './household/service';
import type { MemberContext } from './member-context';

// 인증 · 인가의 실제 보안 경계 (docs/03-architecture.md 5절).
// 프록시 · 레이아웃 검사만 믿지 말고, 데이터를 읽거나 바꾸는 모든 곳에서 requireMember()를 부른다.

/** 현재 요청의 세션 (한 요청 안에서는 한 번만 조회) */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** 로그인한 사용자와 구성원 정보. 로그인하지 않았으면 null */
export const getCurrentMembership = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const membership = await ensureMembership(session.user);
  return { user: session.user, ...membership };
});

/**
 * 승인된 구성원만 통과시킨다.
 * 로그인 안 했으면 /login, 승인 대기 · 내보낸 계정이면 /pending으로 보낸다.
 */
export async function requireMember(): Promise<MemberContext> {
  const current = await getCurrentMembership();
  if (!current) redirect('/login');

  const { member, household } = current;
  if (member.status !== 'active' || !isRole(member.role)) redirect('/pending');

  return {
    userId: current.user.id,
    memberId: member.id,
    householdId: household.id,
    householdName: household.name,
    role: member.role,
    displayName: member.displayName,
    color: member.color,
    timezone: household.timezone,
    mustChangePassword: member.mustChangePassword,
  };
}
