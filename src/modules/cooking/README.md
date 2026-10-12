# cooking — 요리 모듈

설계: [docs/modules/cooking.md](../../../docs/modules/cooking.md)

- 테이블(`schema.ts`): recipe, recipe_ingredient, meal_plan_entry, shopping_item
- core에만 의존한다. cleaning · childcare를 import하지 않는다 (ESLint가 막는다).
- 기능이 셋이라 기능마다 하위 폴더에 `actions.ts` · `queries.ts` · `service.ts` · `validators.ts` · `components/`를 둔다.

| 폴더 · 파일 | 하는 일 |
|---|---|
| `recipe/` | 레시피 등록 · 수정 · 보관, 목록(이름 · 재료 · 태그로 찾기), 상세 |
| `meal-plan/` | 주간 식단 (날짜 카드, 메뉴 넣기 · 빼기, 지난주 복사) |
| `shopping/` | 장보기 (빠른 추가 · 합치기, 체크 · 정리, 식단에서 재료 가져오기) |
| `shopping/parse.ts` | '양파 2개' → 이름 · 수량 · 단위 · 메모 (레시피 재료도 같이 씀) |
| `shopping/category.ts` | 품목 이름으로 카테고리 추정 |
| `shopping/merge.ts` | 여러 레시피 재료 합치기, 집에 늘 있는 양념 |
| `constants.ts` | 끼니 · 종류 · 추천 태그 |
| `components/` | 요리 화면 탭 (식단 · 레시피 · 장보기) |
