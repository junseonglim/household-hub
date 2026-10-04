// 권한 규칙 (docs/05-auth-household.md 6절). DB와 무관한 순수 함수라 단위 테스트로 검증한다.

export const ROLES = ['owner', 'admin', 'member'] as const;
export type Role = (typeof ROLES)[number];

/** 승인 · 역할 변경으로 줄 수 있는 역할. owner 넘기기는 별도 기능(이후). */
export const ASSIGNABLE_ROLES = ['admin', 'member'] as const satisfies readonly Role[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: '소유자',
  admin: '관리자',
  member: '구성원',
};

const RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** role이 minRole 이상인지 */
export function hasRole(role: string, minRole: Role): boolean {
  return isRole(role) && RANK[role] >= RANK[minRole];
}

type Actor = { id: string; role: string };
type Target = { id: string; role: string; status: string };

/** 가입 승인 · 거절, 가구 이름 변경, 공간 관리 */
export function canAdminister(actor: Actor): boolean {
  return hasRole(actor.role, 'admin');
}

/** 역할 변경 · 내보내기: admin 이상이, 자기 자신과 owner가 아닌 활성 구성원에게 */
export function canManageMember(actor: Actor, target: Target): boolean {
  if (!canAdminister(actor)) return false;
  if (actor.id === target.id) return false;
  if (target.status !== 'active') return false;
  return target.role !== 'owner';
}

/**
 * 비밀번호 초기화: admin 이상이, 자기 자신이 아닌 활성 구성원에게.
 * owner도 대상이 된다 — owner가 비밀번호를 잊어도 배우자(admin)가 도울 수 있게.
 */
export function canResetPassword(actor: Actor, target: Target): boolean {
  if (!canAdminister(actor)) return false;
  if (actor.id === target.id) return false;
  return target.status === 'active';
}
