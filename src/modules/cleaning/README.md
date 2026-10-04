# cleaning — 청소 모듈

M2에서 구현한다. 설계: [docs/modules/cleaning.md](../../../docs/modules/cleaning.md)

- core의 공간 · 할 일 엔진 위에 화면과 규칙을 얹는다 (자체 테이블 없음).
- core에만 의존한다. cooking · childcare를 import하지 않는다 (ESLint가 막는다).
- 파일 구조: `components/`, `actions.ts`, `queries.ts`, `service.ts`, `validators.ts` ([docs/03-architecture.md](../../../docs/03-architecture.md) 2절)
