/**
 * 로그인 후 돌아갈 주소를 검증한다. 사이트 내부 경로만 허용한다 (오픈 리다이렉트 방지).
 * '/cooking?week=1' → 그대로, 'https://evil.com' · '//evil.com' · '/\evil.com' → fallback
 */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
