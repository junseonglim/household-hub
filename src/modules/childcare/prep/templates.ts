import type { PrepCategory } from '../constants';

// 추천 준비물 (docs/modules/childcare.md 7절). DB가 아니라 코드 상수로 둔다.
// 수량은 참고용 기본값이고, 등록한 뒤 고칠 수 있다.

export type PrepTemplate = { category: PrepCategory; title: string; quantity?: string };

const group = (category: PrepCategory, items: (string | [string, string])[]): PrepTemplate[] =>
  items.map((item) =>
    typeof item === 'string'
      ? { category, title: item }
      : { category, title: item[0], quantity: item[1] },
  );

export const PREP_TEMPLATES: readonly PrepTemplate[] = [
  ...group('수유', [
    ['젖병', '4개'],
    '젖꼭지',
    '젖병 세정제',
    '젖병 솔',
    '젖병 소독기',
    '분유',
    '수유 쿠션',
    '수유 패드',
    '유축기',
  ]),
  ...group('위생 · 목욕', [
    '기저귀 (신생아용)',
    '물티슈',
    '아기 욕조',
    '목욕 타월',
    '아기 세정제',
    '로션',
    '손톱 가위',
    '체온계',
    '콧물 흡입기',
    ['가제 손수건', '20장'],
  ]),
  ...group('의류 · 침구', [
    ['배냇저고리', '3벌'],
    '바디슈트',
    ['속싸개', '2개'],
    '겉싸개',
    '손싸개',
    '양말',
    '아기 이불',
    '방수 패드',
    '아기 침대',
  ]),
  ...group('외출 · 이동', ['카시트 (퇴원 전 설치)', '유모차', '아기띠', '기저귀 가방']),
  ...group('입원 · 조리원 가방', [
    '산모 패드',
    '수유 브라',
    '수유복',
    '손목 보호대',
    '세면도구',
    '슬리퍼',
    '산모 수첩',
    '신분증',
    '퇴원복 (아기)',
    '겉싸개 (퇴원용)',
  ]),
  ...group('미리 할 일', [
    '조리원 예약',
    '산후도우미 신청',
    '소아과 알아보기',
    '카시트 설치',
    '아기 옷 · 손수건 미리 빨기',
  ]),
];

/** 폼에서 고른 값 ↔ 템플릿 */
export const templateKey = (template: PrepTemplate) => `${template.category}|${template.title}`;
