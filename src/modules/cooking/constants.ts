// 요리 모듈 열거값 (DB는 text, 앱에서 이 값으로 검증한다)

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export const MEAL_KINDS = ['home', 'eating_out', 'delivery'] as const;
export type MealKind = (typeof MEAL_KINDS)[number];
export const MEAL_KIND_LABELS: Record<MealKind, string> = {
  home: '집밥',
  eating_out: '외식',
  delivery: '배달',
};

/** 레시피 등록 화면에서 바로 고를 수 있는 태그 */
export const RECIPE_TAG_PRESETS = [
  '국·찌개',
  '반찬',
  '메인',
  '밥·면',
  '간식',
  '아이',
  '손님상',
] as const;

export const SHOPPING_SOURCES = ['manual', 'meal_plan'] as const;
export type ShoppingSource = (typeof SHOPPING_SOURCES)[number];
