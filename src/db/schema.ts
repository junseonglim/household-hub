// 모든 모듈의 테이블을 한곳에 모은다. drizzle-kit · db 클라이언트 · Better Auth가 이 파일을 읽는다.
// 모듈을 추가하면 여기에 export를 추가한다.
export * from '../modules/core/auth-schema';
export * from '../modules/core/schema';
export * from '../modules/cooking/schema';
export * from '../modules/childcare/schema';
