import { describe, expect, it } from 'vitest';
import { generateTempPassword } from './temp-password';

describe('generateTempPassword', () => {
  it('xxxx-xxxx-xxxx 형태이고 헷갈리는 문자가 없다', () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTempPassword();
      expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
      expect(password).not.toMatch(/[01oil]/);
    }
  });

  it('비밀번호 최소 길이(8자)를 넘는다', () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(8);
  });

  it('매번 다르다', () => {
    const passwords = new Set(Array.from({ length: 100 }, generateTempPassword));
    expect(passwords.size).toBe(100);
  });
});
