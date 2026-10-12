import { canAdminister } from '../household/permissions';

// 할 일 권한 (docs/05-auth-household.md 6절).
// 완료 · 등록 · 수정은 승인된 구성원 누구나 할 수 있다 (requireMember()로 충분).

type Actor = { id: string; role: string };

/** 보관(삭제): 관리자 이상, 또는 내가 만든 할 일 */
export function canArchiveTask(actor: Actor, task: { createdByMemberId: string }): boolean {
  return canAdminister(actor) || task.createdByMemberId === actor.id;
}
