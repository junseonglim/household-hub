import { pgTable, text } from 'drizzle-orm/pg-core';
import { id, timestamps } from '../../db/columns';

// drizzle-kit이 이 파일을 직접 읽으므로 '@/' 별칭 대신 상대 경로를 쓴다.

/** 가구 — 우리 집 전용이라 1행만 존재한다 (docs/04-data-model.md 3절). */
export const household = pgTable('household', {
  id: id(),
  name: text().notNull().default('우리집'),
  timezone: text().notNull().default('Asia/Seoul'),
  ...timestamps,
});
