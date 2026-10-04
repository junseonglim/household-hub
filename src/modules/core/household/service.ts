import { hashPassword } from 'better-auth/crypto';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db, type Tx } from '@/db';
import { account, household, householdMember, session, space, user } from '@/db/schema';
import { DomainError } from '@/lib/domain-error';
import { logActivity } from '../activity/log';
import type { MemberContext } from '../member-context';
import { DEFAULT_SPACES, MEMBER_COLORS, nextMemberColor } from './constants';
import {
  canAdminister,
  canManageMember,
  canResetPassword,
  type AssignableRole,
} from './permissions';
import { generateTempPassword } from './temp-password';

// 가구 · 구성원 업무 규칙 (docs/05-auth-household.md)

type Member = typeof householdMember.$inferSelect;
type Household = typeof household.$inferSelect;
export type Membership = { member: Member; household: Household };

/** 첫 가입자 판정용 잠금 키 (pg_advisory_xact_lock) */
const MEMBERSHIP_LOCK_KEY = 42_0001;

const forbidden = () => new DomainError('FORBIDDEN', '이 작업을 할 권한이 없어요.');

async function findMembership(executor: Tx | typeof db, userId: string) {
  const [row] = await executor
    .select({ member: householdMember, household })
    .from(householdMember)
    .innerJoin(household, eq(householdMember.householdId, household.id))
    .where(eq(householdMember.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * 로그인한 사용자의 구성원 정보를 돌려주고, 아직 없으면 규칙대로 만든다.
 * - 가구가 없으면(첫 가입자): 가구 · 기본 공간 · owner 구성원을 만든다
 * - 가구가 있으면: 승인 대기(pending) 구성원을 만든다
 * 가입 직후에 호출하고, 실패했더라도 다음 접속 때 다시 호출되므로 여러 번 불러도 안전하다.
 */
export async function ensureMembership(authUser: {
  id: string;
  name: string;
}): Promise<Membership> {
  const existing = await findMembership(db, authUser.id);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    // 동시에 두 명이 처음 가입해도 가구가 하나만 생기도록 잠근다
    await tx.execute(sql`select pg_advisory_xact_lock(${MEMBERSHIP_LOCK_KEY})`);
    const again = await findMembership(tx, authUser.id);
    if (again) return again;

    const displayName = authUser.name.trim().slice(0, 10) || '가족';
    const [home] = await tx.select().from(household).limit(1);
    if (!home) return createHouseholdWithOwner(tx, authUser.id, displayName);

    const usedColors = await tx
      .select({ color: householdMember.color })
      .from(householdMember)
      .where(and(eq(householdMember.householdId, home.id), ne(householdMember.status, 'removed')));
    const [member] = await tx
      .insert(householdMember)
      .values({
        householdId: home.id,
        userId: authUser.id,
        status: 'pending',
        role: 'member',
        displayName,
        color: nextMemberColor(usedColors.map((row) => row.color)),
      })
      .returning();
    return { member: member!, household: home };
  });
}

async function createHouseholdWithOwner(
  tx: Tx,
  userId: string,
  displayName: string,
): Promise<Membership> {
  const [home] = await tx.insert(household).values({}).returning();
  await tx.insert(space).values(
    DEFAULT_SPACES.map((preset, index) => ({
      householdId: home!.id,
      name: preset.name,
      icon: preset.icon,
      sortOrder: index,
    })),
  );
  const [owner] = await tx
    .insert(householdMember)
    .values({
      householdId: home!.id,
      userId,
      status: 'active',
      role: 'owner',
      displayName,
      color: MEMBER_COLORS[0],
      approvedAt: new Date(),
    })
    .returning();
  await logActivity(tx, {
    householdId: home!.id,
    actorMemberId: owner!.id,
    module: 'core',
    action: 'household.created',
    target: { type: 'household', id: home!.id },
    payload: { householdName: home!.name, ownerName: displayName },
  });
  return { member: owner!, household: home! };
}

/** 같은 가구의 구성원만 찾는다. 다른 가구의 id면 '없음'으로 처리한다. */
async function getMemberInHousehold(tx: Tx, ctx: MemberContext, memberId: string) {
  const [target] = await tx
    .select()
    .from(householdMember)
    .where(and(eq(householdMember.id, memberId), eq(householdMember.householdId, ctx.householdId)))
    .limit(1);
  if (!target) throw new DomainError('NOT_FOUND', '구성원을 찾을 수 없어요.');
  return target;
}

const actorOf = (ctx: MemberContext) => ({ id: ctx.memberId, role: ctx.role });

export async function approveMember(
  ctx: MemberContext,
  input: { memberId: string; displayName: string; role: AssignableRole; color: string },
) {
  if (!canAdminister(actorOf(ctx))) throw forbidden();
  await db.transaction(async (tx) => {
    const target = await getMemberInHousehold(tx, ctx, input.memberId);
    if (target.status !== 'pending') {
      throw new DomainError('INVALID', '이미 처리된 가입 요청이에요.');
    }
    await tx
      .update(householdMember)
      .set({
        status: 'active',
        role: input.role,
        displayName: input.displayName,
        color: input.color,
        approvedAt: new Date(),
      })
      .where(eq(householdMember.id, target.id));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'core',
      action: 'member.joined',
      target: { type: 'member', id: target.id },
      payload: { displayName: input.displayName, approvedByName: ctx.displayName },
    });
  });
}

/** 가입 거절: 계정을 지운다 (모르는 사람의 가입을 정리) */
export async function rejectMember(ctx: MemberContext, memberId: string) {
  if (!canAdminister(actorOf(ctx))) throw forbidden();
  await db.transaction(async (tx) => {
    const target = await getMemberInHousehold(tx, ctx, memberId);
    if (target.status !== 'pending') {
      throw new DomainError('INVALID', '이미 처리된 가입 요청이에요.');
    }
    await tx.delete(user).where(eq(user.id, target.userId));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'core',
      action: 'member.rejected',
      payload: { displayName: target.displayName },
    });
  });
}

export async function changeMemberRole(
  ctx: MemberContext,
  input: { memberId: string; role: AssignableRole },
) {
  await db.transaction(async (tx) => {
    const target = await getMemberInHousehold(tx, ctx, input.memberId);
    if (!canManageMember(actorOf(ctx), target)) throw forbidden();
    if (target.role === input.role) return;
    await tx
      .update(householdMember)
      .set({ role: input.role })
      .where(eq(householdMember.id, target.id));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'core',
      action: 'member.role_changed',
      target: { type: 'member', id: target.id },
      payload: { displayName: target.displayName, from: target.role, to: input.role },
    });
  });
}

/** 내보내기: 구성원 행은 남기고(기록의 작성자 표시용) 상태만 바꾼 뒤 로그인을 끊는다 */
export async function removeMember(ctx: MemberContext, memberId: string) {
  await db.transaction(async (tx) => {
    const target = await getMemberInHousehold(tx, ctx, memberId);
    if (!canManageMember(actorOf(ctx), target)) throw forbidden();
    await tx
      .update(householdMember)
      .set({ status: 'removed' })
      .where(eq(householdMember.id, target.id));
    await tx.delete(session).where(eq(session.userId, target.userId));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'core',
      action: 'member.removed',
      target: { type: 'member', id: target.id },
      payload: { displayName: target.displayName },
    });
  });
}

/**
 * 비밀번호 초기화: 임시 비밀번호를 만들어 돌려준다 (화면에 한 번만 보여 준다).
 * 그 사람의 모든 로그인을 끊고, 다음 로그인 때 비밀번호를 바꾸도록 표시한다.
 */
export async function resetMemberPassword(ctx: MemberContext, memberId: string): Promise<string> {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db.transaction(async (tx) => {
    const target = await getMemberInHousehold(tx, ctx, memberId);
    if (!canResetPassword(actorOf(ctx), target)) throw forbidden();

    const updated = await tx
      .update(account)
      .set({ password: passwordHash })
      .where(and(eq(account.userId, target.userId), eq(account.providerId, 'credential')))
      .returning({ id: account.id });
    if (updated.length === 0) {
      throw new DomainError('INVALID', '이메일과 비밀번호로 가입한 계정이 아니에요.');
    }
    await tx.delete(session).where(eq(session.userId, target.userId));
    await tx
      .update(householdMember)
      .set({ mustChangePassword: true })
      .where(eq(householdMember.id, target.id));
    await logActivity(tx, {
      householdId: ctx.householdId,
      actorMemberId: ctx.memberId,
      module: 'core',
      action: 'member.password_reset',
      target: { type: 'member', id: target.id },
      payload: { displayName: target.displayName },
    });
  });

  return tempPassword;
}

export async function renameHousehold(ctx: MemberContext, name: string) {
  if (!canAdminister(actorOf(ctx))) throw forbidden();
  await db.update(household).set({ name }).where(eq(household.id, ctx.householdId));
}

export async function updateProfile(
  ctx: MemberContext,
  input: { name: string; displayName: string; color: string },
) {
  await db.transaction(async (tx) => {
    await tx.update(user).set({ name: input.name }).where(eq(user.id, ctx.userId));
    await tx
      .update(householdMember)
      .set({ displayName: input.displayName, color: input.color })
      .where(eq(householdMember.id, ctx.memberId));
  });
}

export async function clearMustChangePassword(ctx: MemberContext) {
  await db
    .update(householdMember)
    .set({ mustChangePassword: false })
    .where(eq(householdMember.id, ctx.memberId));
}

/** 로그인 직후 이동할 곳을 정할 때 쓴다 */
export async function mustChangePassword(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ mustChangePassword: householdMember.mustChangePassword })
    .from(householdMember)
    .where(eq(householdMember.userId, userId))
    .limit(1);
  return row?.mustChangePassword ?? false;
}
