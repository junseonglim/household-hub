# Household Hub (가칭) — 우리집 집안일 통합 관리

우리 가족이 함께 쓰는 집안일 관리 웹 앱입니다 (우리 집 전용).
1차 범위는 **회원가입(관리자 승인)/로그인 + 청소·요리 모듈 + 육아 모듈 틀**이며, 대시보드는 이후 단계에서 추가합니다.
배포는 Vercel + Neon 무료 플랜을 사용합니다.

## 개발 시작하기

필요한 것: Node.js 24 LTS, pnpm, Docker Desktop

```bash
pnpm install
cp .env.example .env.local   # 처음 한 번
pnpm db:up                   # 로컬 PostgreSQL 실행 (Docker)
pnpm db:migrate              # 테이블 생성
pnpm dev                     # http://localhost:3000
```

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm check` | 타입 검사 + 린트 + 포맷 검사 + 단위 테스트 (커밋 전에 실행) |
| `pnpm test` / `pnpm test:e2e` | 단위 테스트 (Vitest) / 화면 테스트 (Playwright, 휴대폰·PC) |
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
| [모듈: 육아](docs/modules/childcare.md) | 틀만 (출산 시기에 신생아 기준으로 상세 설계) |
| [06. 로드맵·결정 사항](docs/06-roadmap.md) | 마일스톤, 결정 사항, 남은 질문 |

## 이력

- 2026-10-03 — 설계 초안 v0.1
- 2026-10-03 — v0.2: 우리 집 전용 · 가입 승인 방식, Vercel + Neon 배포, 육아는 틀만
- 2026-10-03 — M0: 프로젝트 기반 (Next.js 16, Tailwind 4, shadcn/ui, Drizzle, 린트 · 테스트)
