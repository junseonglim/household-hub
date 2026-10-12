import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { shoppingItem } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import type { LocalDate } from '@/lib/local-date';
import { logActivity } from '@/modules/core/activity/log';
import type { MemberContext } from '@/modules/core/member-context';
import type { ShoppingSource } from '../constants';
import { guessCategory, isShoppingCategory } from './category';
import { normalizeItemName, type ParsedItem } from './parse';
import { getImportPreview } from './queries';
import type { UpdateItemInput } from './validators';

// 장보기 업무 규칙 (docs/modules/cooking.md 5절). 장보기는 승인된 구성원 누구나 쓴다.

const itemKey = (item: { name: string; unit: string | null }) =>
  `${normalizeItemName(item.name)}|${item.unit?.trim() ?? ''}`;

/**
 * 항목을 추가한다.
 * - 체크 안 된 같은 이름 + 단위 항목이 이미 있으면 새로 만들지 않고 수량을 더한다.
 * - 카테고리는 예전에 같은 이름에 쓴 값(사용자가 바꾼 값 포함)을 먼저 쓰고, 없으면 이름으로 추정한다.
 */
export async function addItems(
  ctx: MemberContext,
  items: ParsedItem[],
  source: ShoppingSource,
): Promise<{ added: number; merged: number }> {
  if (items.length === 0) throw new DomainError('INVALID', '추가할 것을 골라 주세요.');
  return db.transaction(async (tx) => {
    const open = await tx
      .select()
      .from(shoppingItem)
      .where(
        and(
          eq(shoppingItem.householdId, ctx.householdId),
          eq(shoppingItem.isChecked, false),
          isNull(shoppingItem.clearedAt),
        ),
      )
      .for('update');
    const names = [...new Set(items.map((item) => normalizeItemName(item.name)))];
    const history = await tx
      .select({ name: shoppingItem.name, category: shoppingItem.category })
      .from(shoppingItem)
      .where(
        and(
          eq(shoppingItem.householdId, ctx.householdId),
          inArray(sql`lower(${shoppingItem.name})`, names),
        ),
      )
      .orderBy(desc(shoppingItem.updatedAt));
    const learned = new Map<string, string>();
    for (const row of history) {
      const name = normalizeItemName(row.name);
      if (row.category && !learned.has(name)) learned.set(name, row.category);
    }

    const openByKey = new Map(open.map((row) => [itemKey(row), row]));
    let added = 0;
    let merged = 0;
    for (const item of items) {
      const existing = openByKey.get(itemKey(item));
      if (existing) {
        const quantity =
          existing.quantity !== null && item.quantity !== null
            ? existing.quantity + item.quantity
            : (existing.quantity ?? item.quantity);
        await tx.update(shoppingItem).set({ quantity }).where(eq(shoppingItem.id, existing.id));
        existing.quantity = quantity;
        merged++;
        continue;
      }
      const remembered = learned.get(normalizeItemName(item.name));
      const [created] = await tx
        .insert(shoppingItem)
        .values({
          householdId: ctx.householdId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          note: item.note,
          category:
            remembered && isShoppingCategory(remembered) ? remembered : guessCategory(item.name),
          source,
          createdByMemberId: ctx.memberId,
        })
        .returning();
      openByKey.set(itemKey(created!), created!);
      added++;
    }

    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'cooking',
      action: 'shopping_item.added',
      payload: items.length === 1 ? { name: items[0]!.name } : { count: items.length },
    });
    return { added, merged };
  });
}

/** 정리하지 않은 이 가구의 항목만 바꾼다 */
const openItem = (ctx: MemberContext, itemId: string) =>
  and(
    eq(shoppingItem.id, itemId),
    eq(shoppingItem.householdId, ctx.householdId),
    isNull(shoppingItem.clearedAt),
  );

const notFound = () =>
  new DomainError('NOT_FOUND', '목록에 없는 항목이에요. 화면을 새로 고쳤어요.');

export async function toggleItem(
  ctx: MemberContext,
  input: { itemId: string; checked: boolean },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(shoppingItem)
      .set(
        input.checked
          ? { isChecked: true, checkedByMemberId: ctx.memberId, checkedAt: new Date() }
          : { isChecked: false, checkedByMemberId: null, checkedAt: null },
      )
      .where(openItem(ctx, input.itemId))
      .returning({ id: shoppingItem.id, name: shoppingItem.name });
    if (!updated) throw notFound();
    if (input.checked) {
      await logActivity(tx, {
        householdId: ctx.householdId,
        actorMemberId: ctx.memberId,
        module: 'cooking',
        action: 'shopping_item.checked',
        target: { type: 'shopping_item', id: updated.id },
        payload: { name: updated.name },
      });
    }
  });
}

export async function updateItem(ctx: MemberContext, input: UpdateItemInput) {
  const updated = await db
    .update(shoppingItem)
    .set({
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      category: input.category,
      note: input.note,
    })
    .where(openItem(ctx, input.itemId))
    .returning({ id: shoppingItem.id });
  if (updated.length === 0) throw notFound();
}

/** 잘못 넣은 항목 지우기 (산 기록이 아니므로 실제로 지운다) */
export async function deleteItem(ctx: MemberContext, itemId: string) {
  const deleted = await db
    .delete(shoppingItem)
    .where(openItem(ctx, itemId))
    .returning({ id: shoppingItem.id });
  if (deleted.length === 0) throw notFound();
}

/** 정리: 체크한 항목을 목록에서 숨긴다 (구매 이력으로 남긴다) */
export async function clearChecked(ctx: MemberContext): Promise<number> {
  return db.transaction(async (tx) => {
    const cleared = await tx
      .update(shoppingItem)
      .set({ clearedAt: new Date() })
      .where(
        and(
          eq(shoppingItem.householdId, ctx.householdId),
          eq(shoppingItem.isChecked, true),
          isNull(shoppingItem.clearedAt),
        ),
      )
      .returning({ id: shoppingItem.id });
    if (cleared.length > 0) {
      await logActivity(tx, {
        householdId: ctx.householdId,
        actorMemberId: ctx.memberId,
        module: 'cooking',
        action: 'shopping_list.cleared',
        payload: { count: cleared.length },
      });
    }
    return cleared.length;
  });
}

/** 식단에서 가져오기: 서버에서 미리보기를 다시 계산하고, 고른 재료만 추가한다 */
export async function importFromMealPlan(
  ctx: MemberContext,
  range: { from: LocalDate; to: LocalDate },
  selectedKeys: string[],
) {
  const { candidates } = await getImportPreview(ctx, range);
  const selected = candidates.filter((candidate) => selectedKeys.includes(candidate.key));
  return addItems(
    ctx,
    selected.map(({ name, quantity, unit }) => ({ name, quantity, unit, note: null })),
    'meal_plan',
  );
}
