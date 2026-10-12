import { and, eq, max } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { prepItem } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { logActivity } from '@/modules/core/activity/log';
import type { MemberContext } from '@/modules/core/member-context';
import { PREP_TEMPLATES, templateKey } from './templates';
import type { PrepItemInput, UpdatePrepItemInput } from './validators';

// 출산 준비 체크리스트 (docs/modules/childcare.md 4.5절). 승인된 구성원 누구나 쓴다.
// 잘못 넣은 항목은 실제로 지운다 (기록이 아니라 목록).

async function nextSortOrder(tx: Tx, householdId: string) {
  const [last] = await tx
    .select({ sortOrder: max(prepItem.sortOrder) })
    .from(prepItem)
    .where(eq(prepItem.householdId, householdId));
  return (last?.sortOrder ?? -1) + 1;
}

const sameTitle = (a: string, b: string) =>
  a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();

export async function addPrepItem(ctx: MemberContext, input: PrepItemInput) {
  await db.transaction(async (tx) => {
    await tx.insert(prepItem).values({
      householdId: ctx.householdId,
      ...input,
      sortOrder: await nextSortOrder(tx, ctx.householdId),
      createdByMemberId: ctx.memberId,
    });
  });
}

/**
 * 추천 목록에서 고른 것을 한 번에 등록한다. 이름이 같은 항목이 이미 있으면 건너뛴다.
 * @returns 등록한 개수
 */
export async function addFromTemplates(ctx: MemberContext, keys: string[]): Promise<number> {
  const picked = new Set(keys);
  const templates = PREP_TEMPLATES.filter((template) => picked.has(templateKey(template)));
  if (templates.length === 0) throw new DomainError('INVALID', '등록할 준비물을 골라 주세요.');

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ title: prepItem.title })
      .from(prepItem)
      .where(eq(prepItem.householdId, ctx.householdId));
    const fresh = templates.filter(
      (template) => !existing.some((item) => sameTitle(item.title, template.title)),
    );
    if (fresh.length === 0) return 0;

    const start = await nextSortOrder(tx, ctx.householdId);
    await tx.insert(prepItem).values(
      fresh.map((template, index) => ({
        householdId: ctx.householdId,
        category: template.category,
        title: template.title,
        quantity: template.quantity ?? null,
        sortOrder: start + index,
        createdByMemberId: ctx.memberId,
      })),
    );
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'childcare',
      action: 'prep_item.added',
      payload: { count: fresh.length },
    });
    return fresh.length;
  });
}

export async function togglePrepItem(
  ctx: MemberContext,
  { itemId, done }: { itemId: string; done: boolean },
) {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(prepItem)
      .set(
        done
          ? { isDone: true, doneByMemberId: ctx.memberId, doneAt: new Date() }
          : { isDone: false, doneByMemberId: null, doneAt: null },
      )
      .where(and(eq(prepItem.id, itemId), eq(prepItem.householdId, ctx.householdId)))
      .returning({ id: prepItem.id, title: prepItem.title });
    if (!updated) throw new DomainError('NOT_FOUND', '이미 지운 항목이에요.');
    if (done) {
      await logActivity(tx, {
        householdId: ctx.householdId,
        actorMemberId: ctx.memberId,
        module: 'childcare',
        action: 'prep_item.checked',
        target: { type: 'prep_item', id: updated.id },
        payload: { title: updated.title },
      });
    }
  });
}

export async function updatePrepItem(
  ctx: MemberContext,
  { itemId, ...input }: UpdatePrepItemInput,
) {
  const updated = await db
    .update(prepItem)
    .set(input)
    .where(and(eq(prepItem.id, itemId), eq(prepItem.householdId, ctx.householdId)))
    .returning({ id: prepItem.id });
  if (updated.length === 0) throw new DomainError('NOT_FOUND', '이미 지운 항목이에요.');
}

export async function deletePrepItem(ctx: MemberContext, itemId: string) {
  const deleted = await db
    .delete(prepItem)
    .where(and(eq(prepItem.id, itemId), eq(prepItem.householdId, ctx.householdId)))
    .returning({ id: prepItem.id });
  if (deleted.length === 0) throw new DomainError('NOT_FOUND', '이미 지운 항목이에요.');
}
