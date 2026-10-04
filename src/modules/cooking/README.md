# cooking — 요리 모듈

M3에서 구현한다. 설계: [docs/modules/cooking.md](../../../docs/modules/cooking.md)

- 테이블: recipe, recipe_ingredient, meal_plan_entry, shopping_item
- core에만 의존한다. cleaning · childcare를 import하지 않는다 (ESLint가 막는다).
- 파일 구조: `components/`, `actions.ts`, `queries.ts`, `service.ts`, `schema.ts`, `validators.ts` ([docs/03-architecture.md](../../../docs/03-architecture.md) 2절)
