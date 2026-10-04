// scripts/reset-password.mts에서도 import하므로 다른 모듈에 의존하지 않는다.

/** 헷갈리는 문자(0 · o · 1 · l · i)를 뺀 소문자 + 숫자 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * 관리자가 발급하는 임시 비밀번호. 'k7mp-3xq9-t2ab' 형태 (12자, 약 59비트).
 * 카카오톡으로 전달하기 쉽도록 4자씩 끊는다.
 */
export function generateTempPassword(): string {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)]
    .map((group) => group.join(''))
    .join('-');
}
