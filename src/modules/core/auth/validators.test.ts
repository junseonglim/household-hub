import { describe, expect, it } from 'vitest';
import { changePasswordSchema, signInSchema, signUpSchema } from './validators';

const validSignUp = {
  name: ' 엄마 ',
  email: ' Mom@Example.COM ',
  password: 'correct-horse',
  passwordConfirm: 'correct-horse',
};

describe('signUpSchema', () => {
  it('이름은 앞뒤 공백을 지우고, 이메일은 소문자로 정리한다', () => {
    const result = signUpSchema.parse(validSignUp);
    expect(result.name).toBe('엄마');
    expect(result.email).toBe('mom@example.com');
  });

  it('비밀번호는 8자 이상', () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: 'short',
      passwordConfirm: 'short',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('비밀번호는 8자 이상이어야 해요.');
  });

  it('비밀번호 확인이 다르면 passwordConfirm 필드 오류', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, passwordConfirm: 'different!' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['passwordConfirm']);
  });

  it('이메일 형식이 틀리면 오류', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, email: 'not-an-email' });
    expect(result.error?.issues[0]?.message).toBe('이메일 주소를 확인해 주세요.');
  });

  it('이름이 비어 있거나 20자를 넘으면 오류', () => {
    expect(signUpSchema.safeParse({ ...validSignUp, name: '   ' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignUp, name: '가'.repeat(21) }).success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('비밀번호가 비어 있으면 오류', () => {
    expect(signInSchema.safeParse({ email: 'a@example.com', password: '' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('새 비밀번호 확인이 다르면 오류', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      newPasswordConfirm: 'new-passwrod',
    });
    expect(result.error?.issues[0]?.path).toEqual(['newPasswordConfirm']);
  });
});
