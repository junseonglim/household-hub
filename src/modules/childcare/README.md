# childcare — 육아 모듈

설계: [docs/modules/childcare.md](../../../docs/modules/childcare.md)

- 테이블(`schema.ts`): child, care_log, health_event, growth_record, milestone, prep_item
- core에만 의존한다. cleaning · cooking을 import하지 않는다 (ESLint가 막는다).
- 기능마다 하위 폴더에 `actions.ts` · `queries.ts` · `service.ts` · `validators.ts` · `components/`를 둔다.

| 폴더 · 파일 | 하는 일 |
|---|---|
| `child/` | 아이 등록 · 태어났어요 · 정보 고치기 · 보관 (관리자), 오늘 화면 카드 |
| `child/age.ts` | 출산까지 D-day · 임신 주수 · 생후 N일 · 기념일 (순수 함수) |
| `care/` | 신생아 기록: 기록 버튼 · 입력 창, 진행 중 타이머, 마지막 수유 · 대변, 하루 합계 · 타임라인, 고치기 · 지우기 |
| `care/logic.ts` | 진행 중 여부 · 다음 쪽 · 하루 합계(자정 넘는 수면) · 한 줄 요약 (순수 함수) |
| `growth/` | 키 · 몸무게 · 머리둘레 측정, 추이 그래프(SVG), 발달 기록 |
| `growth/growth.ts` | 늘어난 양 · 그래프 점 · 눈금 (순수 함수) |
| `health/` | 일정: 직접 추가 · 고치기 · 지우기, [했어요] · 완료 취소, [해당 없음] · 되살리기 |
| `health/standard-schedule.ts` | 생년월일로 만드는 표준 일정 (접종 · 검진 · 행정 · 기념일) |
| `health/status.ts` | 일정 상태(놓침 · 지금 · 다가오는 …), 같은 기간 접종 묶기, 화면 구역 나누기 |
| `prep/` | 출산 준비 체크리스트 (추천 목록 고르기, 체크 · 고치기 · 지우기) |
| `prep/templates.ts` | 추천 준비물 47개 |
| `constants.ts` | 성별 · 일정 종류 · 준비물 카테고리 · 기록 종류 · 수유 방법 · 양 칩 · 발달 추천 |
| `components/` | 육아 화면 탭 (오늘 · 일정 · 성장 · 준비) · 아이 고르기 칩 |
