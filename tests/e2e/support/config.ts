// E2E 테스트 공통 설정. 개발 DB를 건드리지 않도록 별도 테스트 DB와 포트를 쓴다.

export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/** 테스트 DB를 만들 때 접속하는 기본 DB (docker-compose.yml의 개발용 DB) */
export const ADMIN_DATABASE_URL = 'postgres://household:household@localhost:5432/household_hub';
export const E2E_DATABASE_NAME = 'household_hub_test';
export const E2E_DATABASE_URL = `postgres://household:household@localhost:5432/${E2E_DATABASE_NAME}`;

/** 첫 가입자(owner)의 로그인 상태 저장 위치 */
export const OWNER_STATE = 'tests/e2e/.auth/owner.json';

/** 테스트용 계정 (example.com은 실제로 쓰이지 않는 예시 도메인) */
export const OWNER = { name: '김엄마', email: 'owner@example.com', password: 'owner-password-1' };
