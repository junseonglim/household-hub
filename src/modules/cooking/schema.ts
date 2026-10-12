import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, timestamps } from '../../db/columns';
import { household, householdMember } from '../core/schema';

// drizzle-kit이 이 파일을 직접 읽으므로 '@/' 별칭 대신 상대 경로를 쓴다.
// 테이블 정의: docs/04-data-model.md 4절

/** 레시피 */
export const recipe = pgTable(
  'recipe',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text(),
    /** 기준 인분 */
    servings: integer(),
    cookMinutes: integer(),
    /** 조리 순서 */
    steps: jsonb()
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** 국 · 찌개, 반찬, 메인 … */
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceUrl: text(),
    createdByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('recipe_household_id_idx').on(table.householdId)],
);

/** 레시피 재료. 레시피를 통해서만 읽으므로 household_id가 없다. */
export const recipeIngredient = pgTable(
  'recipe_ingredient',
  {
    id: id(),
    recipeId: uuid()
      .notNull()
      .references(() => recipe.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** 숫자로 나타낼 수 있는 양 (0.5, 200). '약간'처럼 숫자가 없으면 null */
    quantity: numeric({ mode: 'number' }),
    unit: text(),
    /** '약간', '다진 것' */
    note: text(),
    sortOrder: integer().notNull(),
    ...timestamps,
  },
  (table) => [index('recipe_ingredient_recipe_id_idx').on(table.recipeId)],
);

/** 식단 칸의 메뉴 하나. 한 끼에 여러 개(밥 · 국 · 반찬)일 수 있다. */
export const mealPlanEntry = pgTable(
  'meal_plan_entry',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    date: date({ mode: 'string' }).notNull(),
    /** 'breakfast' | 'lunch' | 'dinner' | 'snack' */
    mealType: text().notNull(),
    /** 'home' | 'eating_out' | 'delivery' */
    kind: text().notNull().default('home'),
    /** 표시 이름. 레시피를 고르면 레시피 제목을 복사해 둔다 */
    title: text().notNull(),
    recipeId: uuid().references(() => recipe.id, { onDelete: 'set null' }),
    cookMemberId: uuid().references(() => householdMember.id, { onDelete: 'set null' }),
    note: text(),
    sortOrder: integer().notNull(),
    ...timestamps,
  },
  (table) => [index('meal_plan_entry_household_date_idx').on(table.householdId, table.date)],
);

/** 장보기 항목. '정리'하면 숨기기만 한다 (구매 이력) */
export const shoppingItem = pgTable(
  'shopping_item',
  {
    id: id(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    quantity: numeric({ mode: 'number' }),
    unit: text(),
    category: text(),
    note: text(),
    /** 'manual' | 'meal_plan' */
    source: text().notNull(),
    isChecked: boolean().notNull().default(false),
    checkedByMemberId: uuid().references(() => householdMember.id, { onDelete: 'set null' }),
    checkedAt: timestamp({ withTimezone: true }),
    clearedAt: timestamp({ withTimezone: true }),
    createdByMemberId: uuid()
      .notNull()
      .references(() => householdMember.id),
    ...timestamps,
  },
  (table) => [
    index('shopping_item_household_open_idx')
      .on(table.householdId)
      .where(sql`${table.clearedAt} is null`),
  ],
);
