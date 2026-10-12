import { normalizeItemName } from './parse';

// 식단에서 장보기로 가져올 때 여러 레시피의 재료를 합친다 (docs/modules/cooking.md 5절).

export type IngredientLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  recipeTitle: string;
};

export type MergedIngredient = {
  /** 같은 재료인지 가리는 값 (이름 + 단위 + 수량 유무) */
  key: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  /** 이 재료가 들어가는 메뉴 (중복 없이, 처음 나온 순서) */
  recipes: string[];
};

/**
 * 이름(공백 정리 · 소문자) + 단위가 같으면 수량을 더한다. 단위가 다르면 따로 둔다.
 * 수량이 없는 재료('약간')는 하나로 합친다.
 */
export function mergeIngredients(lines: IngredientLine[]): MergedIngredient[] {
  const merged = new Map<string, MergedIngredient>();
  for (const line of lines) {
    const unit = line.unit?.trim() || null;
    const key = [normalizeItemName(line.name), unit ?? '', line.quantity === null ? '-' : '#'].join(
      '|',
    );
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        key,
        name: line.name.trim(),
        quantity: line.quantity,
        unit,
        recipes: [line.recipeTitle],
      });
      continue;
    }
    if (existing.quantity !== null && line.quantity !== null) {
      existing.quantity = Math.round((existing.quantity + line.quantity) * 1000) / 1000;
    }
    if (!existing.recipes.includes(line.recipeTitle)) existing.recipes.push(line.recipeTitle);
  }
  return [...merged.values()];
}

/** 집에 늘 있는 양념 · 재료. 가져오기 미리보기에서 기본으로 선택을 풀어 둔다. */
const PANTRY_STAPLES = new Set([
  '물',
  '소금',
  '설탕',
  '후추',
  '간장',
  '진간장',
  '국간장',
  '양조간장',
  '식용유',
  '참기름',
  '들기름',
  '식초',
  '맛술',
  '미림',
  '올리고당',
  '물엿',
  '고춧가루',
  '고추장',
  '된장',
  '깨',
  '통깨',
  '참깨',
  '다진 마늘',
]);

export function isPantryStaple(name: string): boolean {
  return PANTRY_STAPLES.has(normalizeItemName(name));
}
