# 배포 가이드 (Vercel + Neon, 무료)

> 상태: v1 · 2026-10-04 · 구성 설명은 [02. 기술 스택](02-tech-stack.md) 5절

처음 한 번만 하면 되고, 그 뒤로는 `git push`만 하면 자동으로 배포됩니다.
계정 만들기 · 연결은 직접 하셔야 하는 작업이라 순서대로 적었습니다.

## 0. 준비물

- GitHub 계정 (없으면 https://github.com/signup)
- Vercel · Neon은 GitHub 계정으로 가입하므로 따로 준비할 것이 없습니다.

## 1. GitHub에 비공개 저장소 만들고 코드 올리기

1. https://github.com/new 에서
   - Repository name: `household-hub`
   - **Private** 선택
   - README · .gitignore · license는 **추가하지 않음** (이미 있음)
2. 커밋 작성자 이메일(`git config user.email`)이 GitHub 계정에 등록돼 있는지 확인합니다
   (GitHub → Settings → Emails). Vercel 무료(Hobby) 플랜은 비공개 저장소에서
   GitHub 계정과 연결되지 않은 작성자의 커밋을 배포하지 않을 수 있습니다.
3. 만든 저장소 화면에 나오는 주소로 코드를 올립니다. **반드시 이 프로젝트 폴더**
   (`Desktop\집안일 관리시스템`)에서 연 터미널에서 실행합니다:

   ```bash
   git remote add origin https://github.com/<내-아이디>/household-hub.git
   git push -u origin main
   ```

   처음 올릴 때 GitHub 로그인 창이 뜨면 로그인합니다.

## 2. Vercel 가입 → 데이터베이스(Neon) 만들기

1. https://vercel.com/signup → **Hobby** → **Continue with GitHub**
2. 대시보드 왼쪽 메뉴 **Storage** (Integrations 바로 아래) → **Create Database** → **Neon (Serverless Postgres)**
   - 약관 · 플랜: **Free**
   - Region: 한국에서 가까운 **Singapore** (목록에 Tokyo 등 더 가까운 곳이 있으면 그쪽)
   - Database name: `household-hub`
   - 만들고 나면 Neon 계정도 함께 연결됩니다.

## 3. 프로젝트 가져오기 (Import)

1. 대시보드 **Add New… → Project** → `household-hub` 저장소 **Import**
2. Framework Preset은 **Next.js** (자동). 빌드 명령은 바꾸지 않습니다.
   - `package.json`의 `vercel-build`가 **DB 마이그레이션 → 빌드**를 알아서 합니다.
3. **Environment Variables**에 두 개를 넣습니다.

   | Name | Value |
   |---|---|
   | `BETTER_AUTH_SECRET` | 아래 명령으로 만든 무작위 문자열 |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` — 이 프로젝트는 pnpm 12를 쓰는데, Vercel이 자동으로 고르는 pnpm은 10까지라서 `package.json`에 적힌 버전을 쓰도록 한다 |

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   이 값은 비밀번호처럼 다룹니다. 다른 곳에 올리거나 공유하지 마세요.
4. **Deploy** — DB를 아직 연결하지 않아 첫 배포는 실패합니다. 다음 단계에서 연결하면 됩니다.

## 4. 데이터베이스 연결 · 지역 맞추기

1. 프로젝트 → **Storage** 탭 → 2단계에서 만든 DB → **Connect**
   - Environments: Production · Preview · Development 모두 선택
   - `DATABASE_URL`, `DATABASE_URL_UNPOOLED` 등이 자동으로 들어갑니다.
   - "Preview 배포마다 DB 브랜치 만들기" 같은 선택지가 있으면 켭니다 (미리보기 배포가 실제 데이터를 건드리지 않게).
2. 프로젝트 → **Settings → Functions → Function Region**을 DB와 같은 지역(예: Singapore)으로 바꿉니다.
3. **Deployments** → 실패한 배포의 **⋯ → Redeploy**

`BETTER_AUTH_URL`은 넣지 않아도 됩니다. Vercel 주소를 자동으로 씁니다.

## 5. 확인 · 첫 가입

1. `https://<프로젝트이름>.vercel.app/api/health` → `{"ok":true,"db":"up"}`
2. **가족에게 주소를 알려 주기 전에, 본인이 가장 먼저 가입합니다.** 첫 가입자가 우리집 소유자(owner)가 됩니다.
3. 가족에게 주소를 보내고 가입하게 한 뒤, **설정 → 우리집 구성원**에서 승인합니다.
   - 배우자는 '관리자'로 승인하면 가입 승인 · 비밀번호 초기화를 함께 할 수 있습니다.
4. 휴대폰 브라우저 메뉴의 **홈 화면에 추가**로 앱처럼 쓸 수 있습니다.

## 6. 가족이 모두 가입했으면 가입 닫기

프로젝트 → Settings → Environment Variables → `SIGNUP_ENABLED` = `false` 추가 → Redeploy.
다시 열려면 `true`로 바꾸고 Redeploy.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 빌드 로그에 `DATABASE_URL이 없습니다` | 4-1 DB 연결을 했는지, Production에 체크했는지 |
| 빌드 로그에 `BETTER_AUTH_SECRET` 오류 | 3-3 환경 변수 (32자 이상) |
| 설치 단계(`pnpm install`)에서 lockfile · 버전 오류 | 3-3의 `ENABLE_EXPERIMENTAL_COREPACK=1`이 있는지 |
| `/api/health`가 `db: down` | Neon 대시보드에서 DB가 살아 있는지, 무료 한도를 넘지 않았는지 |
| 처음 열 때 몇 초 느림 | 정상. Neon 무료 플랜은 5분간 쓰지 않으면 잠깐 쉬었다가 깨어남 |
| 관리자 모두 비밀번호를 잊음 | 아래 비상 초기화 |

### 비상 초기화 (관리자 모두 비밀번호를 잊었을 때)

1. Vercel → Storage → DB → **`DATABASE_URL_UNPOOLED`** 값을 복사합니다 (Show secret).
2. 이 프로젝트 폴더의 PowerShell에서:

   ```powershell
   $env:DATABASE_URL='<복사한 주소>'; pnpm admin:reset-password <내 이메일>
   ```

3. 나온 임시 비밀번호로 로그인하면 비밀번호를 바꾸라고 안내합니다.
4. 창을 닫으면 `$env:DATABASE_URL`은 사라집니다. 주소를 파일에 저장하지 마세요.
