import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, timestamps } from '../../db/columns';
import { household, householdMember } from '../core/schema';

// drizzle-kit이 이 파일을 직접 읽으므로 '@/' 별칭 대신 상대 경로를 쓴다.
// 테이블 정의: docs/04-data-model.md 5절.

/** 아이. 태어나기 전에는 태명 · 예정일만 있다 */
export const child = pgTable(
  'child',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    /** 태명 → 태어나면 이름으로 바꿀 수 있다 */
    name: text().notNull(),
    dueDate: date({ mode: 'string' }),
    /** null이면 출산 전 */
    birthDate: date({ mode: 'string' }),
    /** 'female' | 'male' | null(모름 · 비공개) */
    sex: text(),
    sortOrder: integer().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('child_household_id_idx').on(table.householdId)],
);

/** 접종 · 검진 · 행정 · 기념일(표준 일정) + 직접 추가한 일정 */
export const healthEvent = pgTable(
  'health_event',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    childId: uuid()
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    /** 'vaccination' | 'checkup' | 'admin' | 'celebration' | 'prenatal' | 'visit' | 'appointment' */
    kind: text().notNull(),
    title: text().notNull(),
    /** 표준 일정 코드 ('dtap-1'). 직접 추가한 일정은 null */
    standardCode: text(),
    /** 권장 시작일 · 예정일 */
    dueDate: date({ mode: 'string' }),
    /** 권장 마지막 날 (기간이 있는 일정) */
    dueUntil: date({ mode: 'string' }),
    /** 예약 시각 (선택) */
    scheduledAt: timestamp({ withTimezone: true }),
    place: text(),
    doneOn: date({ mode: 'string' }),
    doneByMemberId: uuid().references(() => householdMember.id, { onDelete: 'set null' }),
    /** 표준 일정 '해당 없음' */
    dismissedAt: timestamp({ withTimezone: true }),
    note: text(),
    ...timestamps,
  },
  (table) => [
    unique('health_event_child_standard_code_unique').on(table.childId, table.standardCode),
    index('health_event_child_due_idx').on(table.childId, table.dueDate),
  ],
);

/** 신생아 기록 종류별 내용 (care/validators.ts가 검증한다) */
export type CareLogDetails =
  | { method: 'breast'; side: 'left' | 'right' | 'both' }
  | { method: 'pumped' | 'formula'; amountMl: number }
  | { kind: 'wet' | 'dirty' | 'both' }
  | { celsius: number }
  | { name: string; dose: string | null }
  | Record<string, never>;

/**
 * 신생아 기록: 수유 · 기저귀 · 수면 · 체온 · 약.
 * 수면 · 모유 직수는 타이머라 끝 시각이 비어 있으면 진행 중이다 (아이마다 종류별 하나).
 */
export const careLog = pgTable(
  'care_log',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    childId: uuid()
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    /** 'feeding' | 'diaper' | 'sleep' | 'temperature' | 'medicine' */
    type: text().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    /** 수면 · 모유 직수만. null이면 진행 중 */
    endedAt: timestamp({ withTimezone: true }),
    details: jsonb()
      .$type<CareLogDetails>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    note: text(),
    recordedByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    ...timestamps,
  },
  (table) => [
    index('care_log_child_started_idx').on(table.childId, table.startedAt.desc()),
    // 진행 중인 타이머는 아이마다 종류별 하나
    uniqueIndex('care_log_running_timer_unique')
      .on(table.childId, table.type)
      .where(
        sql`${table.endedAt} is null and (${table.type} = 'sleep' or (${table.type} = 'feeding' and ${table.details}->>'method' = 'breast'))`,
      ),
  ],
);

/** 성장 측정. '태어났어요'의 출생 몸무게 · 키도 여기에 남는다 */
export const growthRecord = pgTable(
  'growth_record',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    childId: uuid()
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    measuredOn: date({ mode: 'string' }).notNull(),
    weightKg: numeric({ precision: 5, scale: 2, mode: 'number' }),
    heightCm: numeric({ precision: 4, scale: 1, mode: 'number' }),
    headCm: numeric({ precision: 4, scale: 1, mode: 'number' }),
    note: text(),
    recordedByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    ...timestamps,
  },
  (table) => [
    index('growth_record_child_measured_idx').on(table.childId, table.measuredOn),
    check(
      'growth_record_has_value',
      sql`${table.weightKg} is not null or ${table.heightCm} is not null or ${table.headCm} is not null`,
    ),
  ],
);

/** 출산 준비 체크리스트 (아이와 무관하게 가구 단위) */
export const prepItem = pgTable(
  'prep_item',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    category: text().notNull(),
    title: text().notNull(),
    /** '4개' 같은 참고용 글 */
    quantity: text(),
    note: text(),
    isDone: boolean().notNull().default(false),
    doneByMemberId: uuid().references(() => householdMember.id, { onDelete: 'set null' }),
    doneAt: timestamp({ withTimezone: true }),
    sortOrder: integer().notNull(),
    createdByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    ...timestamps,
  },
  (table) => [index('prep_item_household_id_idx').on(table.householdId)],
);

/** 발달 기록 (첫 미소 · 뒤집기 …). 몇 개월에 해야 한다는 기준은 두지 않는다 */
export const milestone = pgTable(
  'milestone',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    childId: uuid()
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    achievedOn: date({ mode: 'string' }).notNull(),
    note: text(),
    recordedByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    ...timestamps,
  },
  (table) => [index('milestone_child_achieved_idx').on(table.childId, table.achievedOn)],
);
