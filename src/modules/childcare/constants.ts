// 육아 모듈 열거값 (DB는 text, 앱에서 이 값으로 검증한다)

export const SEXES = ['female', 'male'] as const;
export type Sex = (typeof SEXES)[number];
export const SEX_LABELS: Record<Sex, string> = { female: '여아', male: '남아' };

export const HEALTH_EVENT_KINDS = [
  'vaccination',
  'checkup',
  'admin',
  'celebration',
  'prenatal',
  'visit',
  'appointment',
] as const;
export type HealthEventKind = (typeof HEALTH_EVENT_KINDS)[number];

export const HEALTH_EVENT_KIND_LABELS: Record<HealthEventKind, string> = {
  vaccination: '예방접종',
  checkup: '건강검진',
  admin: '행정',
  celebration: '기념일',
  prenatal: '산부인과',
  visit: '병원 방문',
  appointment: '그 밖의 일정',
};

export const HEALTH_EVENT_KIND_ICONS: Record<HealthEventKind, string> = {
  vaccination: '💉',
  checkup: '🩺',
  admin: '📄',
  celebration: '🎂',
  prenatal: '🤰',
  visit: '🏥',
  appointment: '📅',
};

/** [+ 일정]으로 직접 넣을 수 있는 종류. 접종은 일본뇌염 2차처럼 표준 일정에 없는 차수를 넣을 때 */
export const CUSTOM_EVENT_KINDS = [
  'prenatal',
  'visit',
  'vaccination',
  'appointment',
] as const satisfies readonly HealthEventKind[];
export type CustomEventKind = (typeof CUSTOM_EVENT_KINDS)[number];

/** 기간이 지나도록 안 했으면 '놓침'으로 보여 줄 종류. 병원 방문 · 기념일 같은 일정은 날짜가 지나면 그냥 지난 일정이 된다 */
export const MISSABLE_KINDS: readonly HealthEventKind[] = ['vaccination', 'checkup', 'admin'];

export const PREP_CATEGORIES = [
  '수유',
  '위생 · 목욕',
  '의류 · 침구',
  '외출 · 이동',
  '입원 · 조리원 가방',
  '미리 할 일',
  '기타',
] as const;
export type PrepCategory = (typeof PREP_CATEGORIES)[number];

export function isPrepCategory(value: string): value is PrepCategory {
  return (PREP_CATEGORIES as readonly string[]).includes(value);
}
