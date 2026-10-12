# Household Hub (가칭) — 우리집 집안일 통합 관리

우리 가족이 함께 쓰는 집안일 관리 웹 앱입니다 (우리 집 전용).
1차 범위는 **회원가입(관리자 승인)/로그인 + 청소·요리 모듈 + 육아 모듈 틀**이며, 대시보드는 이후 단계에서 추가합니다.
배포는 Vercel + Neon 무료 플랜을 사용합니다.

## 개발 시작하기

필요한 것: Node.js 24 LTS, pnpm, Docker Desktop

```bash
pnpm install
cp .env.example .env.local   # 처음 한 번 — BETTER_AUTH_SECRET 값을 채운다
pnpm db:up                   # 로컬 PostgreSQL 실행 (Docker)
pnpm db:migrate              # 테이블 생성
pnpm dev                     # http://localhost:3000
```

로컬에서 처음 가입한 계정이 우리집 소유자(owner)가 됩니다. 이후 가입자는 설정 → 우리집 구성원에서 승인합니다.
청소 화면에서 **추천 할 일 고르기**로 반복 할 일을 한 번에 등록할 수 있습니다.

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm check` | 타입 검사 + 린트 + 포맷 검사 + 단위 테스트 (커밋 전에 실행) |
| `pnpm test` / `pnpm test:e2e` | 단위 테스트 (Vitest) / 화면 테스트 (Playwright, 휴대폰·PC). 화면 테스트는 운영 빌드를 3100 포트에 띄우고 별도 테스트 DB(`household_hub_test`)를 매번 비워서 쓴다 |
| `pnpm admin:reset-password <이메일>` | 관리자 모두 비밀번호를 잊었을 때 비상 초기화 ([배포 가이드](docs/deploy.md)) |
| `pnpm format` | 코드 자동 정리 (Prettier) |
| `pnpm db:up` / `pnpm db:down` | 로컬 DB 켜기 / 끄기 |
| `pnpm db:generate` | 스키마(`schema.ts`)를 바꾼 뒤 마이그레이션 파일 생성 |
| `pnpm db:migrate` | 마이그레이션 적용 |
| `pnpm db:studio` | DB를 브라우저에서 보기 (Drizzle Studio) |

DB 연결 확인: http://localhost:3000/api/health → `{"ok":true,"db":"up"}`

## 설계 문서

| 문서 | 내용 |
|---|---|
| [01. 개요](docs/01-overview.md) | 목적, 범위, 사용자, 용어, 설계 원칙 |
| [02. 기술 스택](docs/02-tech-stack.md) | 스택과 선택 근거, Java 대응표, 무료 배포 구성 |
| [03. 아키텍처](docs/03-architecture.md) | 시스템 구성, 폴더 구조, 계층·모듈 규칙, 공통 엔진(할 일·활동 로그) |
| [04. 데이터 모델](docs/04-data-model.md) | ERD, 전체 테이블 정의 |
| [05. 인증·가구](docs/05-auth-household.md) | 회원가입/로그인, 가입 승인, 권한, 보안 |
| [모듈: 청소](docs/modules/cleaning.md) | 공간, 반복 할 일, 완료 기록 |
| [모듈: 요리](docs/modules/cooking.md) | 레시피, 주간 식단, 장보기 목록 |
| [모듈: 육아](docs/modules/childcare.md) | 출산 준비, 건강 · 일정(표준 접종 · 검진 자동 생성), 신생아 기록, 성장 · 발달 기록 |
| [06. 로드맵·결정 사항](docs/06-roadmap.md) | 마일스톤, 결정 사항, 남은 질문 |
| [배포 가이드](docs/deploy.md) | GitHub · Vercel · Neon 연결, 첫 가입, 문제 해결 |

## 이력

- 2026-10-03 — 설계 초안 v0.1
- 2026-10-03 — v0.2: 우리 집 전용 · 가입 승인 방식, Vercel + Neon 배포, 육아는 틀만
- 2026-10-03 — M0: 프로젝트 기반 (Next.js 16, Tailwind 4, shadcn/ui, Drizzle, 린트 · 테스트)
- 2026-10-04 — M1: 회원가입 · 로그인 · 가입 승인 · 구성원 관리 (Better Auth), 배포 준비
- 2026-10-11 — M2: 청소 모듈 + 할 일 엔진 (반복 규칙, 오늘 보기, 1탭 완료 · 취소, 완료 기록, 공간별 보기 · 편집, 추천 할 일)
- 2026-10-12 — M3: 요리 모듈 (레시피, 주간 식단 · 지난주 복사, 장보기 · 식단에서 재료 가져오기)
- 2026-10-12 — M4-1: 육아 모듈 출산 전 기능 (아이 등록 · D-day, 출산 준비 체크리스트, 일정 · 태어났어요 → 표준 접종 · 검진 · 행정 일정)
- 2026-10-12 — M4-2: 육아 모듈 신생아 기록 (수유 · 기저귀 · 수면 · 체온 · 약, 타이머, 하루 합계 · 타임라인), 성장 · 발달 기록
