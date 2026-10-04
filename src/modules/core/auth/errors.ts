import { isAPIError } from 'better-auth/api';

/** Better Auth 오류를 사용자에게 보여 줄 한국어 문장으로 바꾼다. 모르는 오류면 null */
export function authErrorMessage(error: unknown): string | null {
  if (!isAPIError(error)) return null;
  if (error.statusCode === 429) return '시도가 너무 많아요. 잠시 후 다시 해 주세요.';

  const code = (error.body as { code?: string } | undefined)?.code ?? '';
  if (code.startsWith('USER_ALREADY_EXISTS')) return '이미 가입된 이메일이에요.';
  if (code === 'INVALID_EMAIL_OR_PASSWORD') {
    // 계정이 있는지 없는지 알 수 없도록 같은 문장을 쓴다
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }
  if (code === 'INVALID_PASSWORD') return '현재 비밀번호가 올바르지 않아요.';
  if (code === 'PASSWORD_TOO_SHORT' || code === 'PASSWORD_TOO_LONG') {
    return '비밀번호는 8~128자여야 해요.';
  }
  if (error.statusCode === 400 && /sign ?up/i.test(error.message)) {
    return '지금은 새 가입을 받지 않아요.';
  }
  return null;
}
