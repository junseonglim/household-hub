import { z } from 'zod';
import { MEMBER_COLORS } from './constants';
import { ASSIGNABLE_ROLES } from './permissions';

// 입력 규칙: docs/05-auth-household.md 5.1절

export const personNameSchema = z
  .string()
  .trim()
  .min(1, '이름을 입력해 주세요.')
  .max(20, '이름은 20자까지 쓸 수 있어요.');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, '호칭을 입력해 주세요.')
  .max(10, '호칭은 10자까지 쓸 수 있어요.');

export const colorSchema = z.enum(MEMBER_COLORS, { error: '색을 골라 주세요.' });

export const memberIdSchema = z.uuid({ error: '잘못된 요청이에요.' });

export const householdNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '가구 이름을 입력해 주세요.')
    .max(30, '가구 이름은 30자까지 쓸 수 있어요.'),
});

export const approveMemberSchema = z.object({
  memberId: memberIdSchema,
  displayName: displayNameSchema,
  role: z.enum(ASSIGNABLE_ROLES, { error: '역할을 골라 주세요.' }),
  color: colorSchema,
});

export const changeRoleSchema = z.object({
  memberId: memberIdSchema,
  role: z.enum(ASSIGNABLE_ROLES, { error: '역할을 골라 주세요.' }),
});

export const memberTargetSchema = z.object({ memberId: memberIdSchema });

export const profileSchema = z.object({
  name: personNameSchema,
  displayName: displayNameSchema,
  color: colorSchema,
});
