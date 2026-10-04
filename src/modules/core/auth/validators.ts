import { z } from 'zod';
import { personNameSchema } from '../household/validators';

// 입력 규칙: docs/05-auth-household.md 5.1절

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: '이메일 주소를 확인해 주세요.' }));

const newPasswordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 해요.')
  .max(128, '비밀번호는 128자까지 쓸 수 있어요.');

export const signUpSchema = z
  .object({
    name: personNameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    passwordConfirm: z.string(),
  })
  .refine((input) => input.password === input.passwordConfirm, {
    path: ['passwordConfirm'],
    error: '비밀번호가 서로 달라요.',
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
    newPassword: newPasswordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((input) => input.newPassword === input.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    error: '새 비밀번호가 서로 달라요.',
  });
