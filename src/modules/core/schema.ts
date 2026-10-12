import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, timestamps } from '../../db/columns';
import { user } from './auth-schema';
import type { Recurrence } from './task/recurrence';

// drizzle-kit이 이 파일을 직접 읽으므로 '@/' 별칭 대신 상대 경로를 쓴다.
// 테이블 정의: docs/04-data-model.md 3절

/** 가구 — 우리 집 전용이라 1행만 존재한다. 첫 가입자가 생길 때 만들어진다. */
export const household = pgTable('household', {
  id: id(),
  name: text().notNull().default('우리집'),
  timezone: text().notNull().default('Asia/Seoul'),
  ...timestamps,
});

/** 구성원 — 가입한 사용자와 가구를 잇는다. 승인 전에는 status = 'pending' */
export const householdMember = pgTable(
  'household_member',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    // 1인 1가구
    userId: text()
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** 'pending' | 'active' | 'removed' */
    status: text().notNull(),
    /** 'owner' | 'admin' | 'member' */
    role: text().notNull().default('member'),
    displayName: text().notNull(),
    color: text().notNull(),
    approvedAt: timestamp({ withTimezone: true }),
    mustChangePassword: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => [index('household_member_household_id_idx').on(table.householdId)],
);

/** 공간 — 거실, 주방, 욕실 … (청소 모듈에서 사용) */
export const space = pgTable(
  'space',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    icon: text(),
    sortOrder: integer().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('space_household_id_idx').on(table.householdId)],
);

/** 할 일 — 반복되는 일의 공통 엔진 (docs/03-architecture.md 6.1절). 청소가 첫 사용처 */
export const task = pgTable(
  'task',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    /** 'cleaning' (이후 다른 모듈) */
    module: text().notNull(),
    spaceId: uuid().references(() => space.id, { onDelete: 'set null' }),
    title: text().notNull(),
    note: text(),
    recurrence: jsonb().$type<Recurrence>().notNull(),
    /** 첫 예정일 계산 기준 */
    startDate: date({ mode: 'string' }).notNull(),
    /** 다음 예정일. 1회성을 완료했거나 기한 없는 1회성이면 null */
    nextDueDate: date({ mode: 'string' }),
    /** null = 누구나 */
    assigneeMemberId: uuid().references(() => householdMember.id, { onDelete: 'set null' }),
    estimatedMinutes: integer(),
    lastCompletedAt: timestamp({ withTimezone: true }),
    createdByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('task_household_module_due_idx')
      .on(table.householdId, table.module, table.nextDueDate)
      .where(sql`${table.archivedAt} is null`),
  ],
);

/** 완료 기록 — 누가 언제 했는지. 실수 정정(완료 취소)은 실제로 지운다. */
export const taskCompletion = pgTable(
  'task_completion',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    taskId: uuid()
      .notNull()
      .references(() => task.id, { onDelete: 'cascade' }),
    /** 실제로 한 사람 (다른 사람이 대신 체크할 수 있다) */
    completedByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    completedAt: timestamp({ withTimezone: true }).notNull(),
    /** 완료 당시의 예정일. 완료를 취소하면 이 값으로 되돌린다 */
    dueDate: date({ mode: 'string' }),
    note: text(),
    ...timestamps,
  },
  (table) => [
    index('task_completion_task_completed_idx').on(table.taskId, table.completedAt.desc()),
    index('task_completion_household_completed_idx').on(table.householdId, table.completedAt),
  ],
);

/** 활동 로그 — 모든 모듈의 주요 행동을 쌓는다 (대시보드 재료). 추가만 한다. */
export const activityLog = pgTable(
  'activity_log',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    actorMemberId: uuid().references(() => householdMember.id, { onDelete: 'set null' }),
    /** 'core' | 'cleaning' | 'cooking' | 'childcare' */
    module: text().notNull(),
    /** '<대상>.<과거형 동사>' 예: 'member.joined' */
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    /** 표시용 스냅샷 (이름 · 제목 등) */
    payload: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('activity_log_household_created_idx').on(table.householdId, table.createdAt.desc()),
  ],
);
