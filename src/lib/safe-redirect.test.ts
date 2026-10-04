import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('사이트 내부 경로는 그대로 쓴다', () => {
    expect(safeRedirectPath('/cooking')).toBe('/cooking');
    expect(safeRedirectPath('/settings/household?tab=1')).toBe('/settings/household?tab=1');
  });

  it('외부 주소는 막는다', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('/\\evil.example')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
  });

  it('값이 없거나 이상하면 기본값', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
    expect(safeRedirectPath('/a\nb')).toBe('/');
    expect(safeRedirectPath(undefined, '/cleaning')).toBe('/cleaning');
  });
});
