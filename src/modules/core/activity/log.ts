import type { Tx } from '@/db';
import { activityLog } from '@/db/schema';

export type ActivityEntry = {
  householdId: string;
  /** 행동한 구성원. 시스템이 한 일이면 null */
  actorMemberId: string | null;
  module: 'core' | 'cleaning' | 'cooking' | 'childcare';
  /** '<대상>.<과거형 동사>' 예: 'member.joined' */
  action: string;
  target?: { type: string; id: string };
  /** 표시용 스냅샷 (이름 · 제목). 원본이 지워져도 피드가 보이도록 복사해 둔다 */
  payload?: Record<string, unknown>;
};

/**
 * 활동 로그를 남긴다 (docs/03-architecture.md 6.2절).
 * 본 작업과 같은 트랜잭션 안에서 호출한다.
 */
export async function logActivity(tx: Tx, entry: ActivityEntry): Promise<void> {
  await tx.insert(activityLog).values({
    householdId: entry.householdId,
    actorMemberId: entry.actorMemberId,
    module: entry.module,
    action: entry.action,
    targetType: entry.target?.type ?? null,
    targetId: entry.target?.id ?? null,
    payload: entry.payload ?? {},
  });
}
