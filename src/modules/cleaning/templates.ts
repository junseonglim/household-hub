import type { Recurrence } from '@/modules/core/task/recurrence';

// 처음 설정에서 고르는 추천 할 일 (docs/modules/cleaning.md 4.4절). DB가 아니라 코드 상수로 둔다.
// 공간은 이름으로 찾는다. 가구에서 이름을 바꿨거나 보관했으면 '공간 없음'으로 등록된다.

export type CleaningTemplate = {
  title: string;
  spaceName: string;
  recurrence: Recurrence;
  /** 처음 설정 화면의 짧은 도움말 */
  hint?: string;
};

export const CLEANING_TEMPLATES: readonly CleaningTemplate[] = [
  { title: '청소기 돌리기', spaceName: '거실', recurrence: { type: 'every_n_days', days: 2 } },
  { title: '바닥 물걸레', spaceName: '거실', recurrence: { type: 'weekly', weekdays: [3, 6] } },
  { title: '설거지 · 싱크대 정리', spaceName: '주방', recurrence: { type: 'daily' } },
  {
    title: '음식물 쓰레기 버리기',
    spaceName: '주방',
    recurrence: { type: 'every_n_days', days: 2 },
  },
  {
    title: '분리수거',
    spaceName: '베란다',
    recurrence: { type: 'every_n_days', days: 7 },
    hint: '배출 요일이 정해져 있으면 매주 요일로 바꿔 주세요.',
  },
  { title: '화장실 청소', spaceName: '욕실', recurrence: { type: 'weekly', weekdays: [6] } },
  {
    title: '빨래 돌리기 · 널기',
    spaceName: '다용도실',
    recurrence: { type: 'every_n_days', days: 2 },
  },
  { title: '수건 빨래', spaceName: '다용도실', recurrence: { type: 'every_n_days', days: 3 } },
  { title: '이불 빨래', spaceName: '침실', recurrence: { type: 'every_n_days', days: 14 } },
  { title: '냉장고 정리', spaceName: '주방', recurrence: { type: 'monthly', day: 1 } },
  { title: '세탁기 통세척', spaceName: '다용도실', recurrence: { type: 'every_n_days', days: 30 } },
  {
    title: '에어컨 · 공기청정기 필터',
    spaceName: '거실',
    recurrence: { type: 'every_n_days', days: 90 },
  },
  { title: '현관 정리', spaceName: '현관', recurrence: { type: 'weekly', weekdays: [0] } },
];
