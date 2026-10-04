import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

// 모든 테이블 공통 컬럼 (docs/04-data-model.md 1절).
// 컬럼 이름은 drizzle의 casing 옵션으로 snake_case가 된다 (createdAt → created_at).

/** UUID v7 기본 키. 시간순으로 정렬된다. */
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
