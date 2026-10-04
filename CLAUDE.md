@AGENTS.md

# Household Hub — 프로젝트 메모

우리 집 전용 집안일 관리 웹 앱. 사용자와의 대화 · 문서 · UI 문구는 한국어, 코드 식별자는 영어.

- 설계 문서: `docs/` (README.md에 목차). 구현 전에 해당 모듈 문서와 `docs/03-architecture.md`를 읽는다.
- 진행 상황 · 결정 사항: `docs/06-roadmap.md`
- 모듈 규칙: `src/modules/{cleaning,cooking,childcare}`는 서로 import하지 않고 `core`에만 의존한다 (ESLint로 강제).
- DB 스키마 파일(`schema.ts`)은 drizzle-kit이 직접 읽으므로 `@/` 대신 상대 경로로 import한다.
- 변경 후 `pnpm check`(타입 · 린트 · 포맷 · 단위 테스트)를 통과시킨다. 화면을 바꿨으면 `pnpm test:e2e`도.
