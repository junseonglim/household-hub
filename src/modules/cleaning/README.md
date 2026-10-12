# cleaning — 청소 모듈

설계: [docs/modules/cleaning.md](../../../docs/modules/cleaning.md)

- core의 공간 · 할 일 엔진(`modules/core/task`, `module = 'cleaning'`) 위에 화면과 규칙을 얹는다 (자체 테이블 없음).
- core에만 의존한다. cooking · childcare를 import하지 않는다 (ESLint가 막는다).

| 파일 | 하는 일 |
|---|---|
| `actions.ts` | 서버 액션: 등록 · 수정 · 보관, 완료 · 완료 취소, 처음 설정 |
| `queries.ts` | 할 일 화면 · 공간별 요약 · 상세 조회 |
| `board.ts` | 밀린 일 · 오늘 · 이번 주 … 묶기, 공간별 요약 (순수 함수 + 테스트) |
| `validators.ts` | 폼 값 → 할 일 엔진 입력 (반복 규칙 해석 + 테스트) |
| `form-fields.ts` | 화면과 서버가 함께 쓰는 폼 칸 이름 |
| `templates.ts` | 처음 설정의 추천 할 일 |
| `components/` | 할 일 목록 · 행, 완료 기록 창, 등록 · 수정 폼, 반복 고르기, 처음 설정, 공간 카드 |
