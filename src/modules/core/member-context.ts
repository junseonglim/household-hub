import type { Role } from './household/permissions';

/** 요청한 사람이 누구인지. requireMember()가 만든다. householdId는 항상 여기서 가져온다. */
export type MemberContext = {
  userId: string;
  memberId: string;
  householdId: string;
  householdName: string;
  role: Role;
  displayName: string;
  color: string;
  /** '오늘' 계산 기준 (예: 'Asia/Seoul') */
  timezone: string;
  /** 관리자가 임시 비밀번호를 발급했으면 true */
  mustChangePassword: boolean;
};
