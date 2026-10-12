import { DomainError } from '@/lib/domain-error';
import { failure, type FormState } from '@/lib/form-state';
import { requireMember } from './auth-context';
import type { MemberContext } from './member-context';

/**
 * 서버 액션 공통 틀: 승인된 구성원인지 확인하고, 업무 규칙 위반(DomainError)은 폼 오류로 돌려준다.
 * 그 외 오류는 그대로 던진다 (error.tsx). 성공 · 실패와 관계없이 화면을 새로 그린다
 * (예: 다른 가족이 먼저 바꿔서 실패했으면 바뀐 내용을 보여 준다).
 */
export async function guardedAction<T>(
  run: (ctx: MemberContext) => Promise<FormState<T>>,
  revalidate: () => void,
): Promise<FormState<T>> {
  const ctx = await requireMember();
  try {
    return await run(ctx);
  } catch (error) {
    if (error instanceof DomainError) return failure<T>(error.message);
    throw error;
  } finally {
    revalidate();
  }
}
