/** 구성원 표시 색 (담당자 칩 등). 가입 순서대로 안 쓴 색을 배정한다. */
export const MEMBER_COLORS = [
  '#F97316', // 주황
  '#3B82F6', // 파랑
  '#10B981', // 초록
  '#A855F7', // 보라
  '#EC4899', // 분홍
  '#EAB308', // 노랑
  '#14B8A6', // 청록
  '#EF4444', // 빨강
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

/** 색 고르기에서 화면 낭독기로 읽어 줄 이름 */
export const MEMBER_COLOR_NAMES: Record<MemberColor, string> = {
  '#F97316': '주황',
  '#3B82F6': '파랑',
  '#10B981': '초록',
  '#A855F7': '보라',
  '#EC4899': '분홍',
  '#EAB308': '노랑',
  '#14B8A6': '청록',
  '#EF4444': '빨강',
};

/** 아직 아무도 쓰지 않은 첫 번째 색. 모두 쓰였으면 순서대로 돌려 쓴다. */
export function nextMemberColor(usedColors: readonly string[]): MemberColor {
  const unused = MEMBER_COLORS.find((color) => !usedColors.includes(color));
  return unused ?? MEMBER_COLORS[usedColors.length % MEMBER_COLORS.length]!;
}

/** 가구를 만들 때 함께 만드는 기본 공간 (docs/04-data-model.md 3절) */
export const DEFAULT_SPACES = [
  { name: '거실', icon: '🛋️' },
  { name: '주방', icon: '🍳' },
  { name: '욕실', icon: '🛁' },
  { name: '침실', icon: '🛏️' },
  { name: '아이방', icon: '🧸' },
  { name: '현관', icon: '🚪' },
  { name: '베란다', icon: '🪴' },
  { name: '다용도실', icon: '🧺' },
] as const;

export const MEMBER_STATUSES = ['pending', 'active', 'removed'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
