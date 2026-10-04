import { describe, expect, it } from 'vitest';
import { isActivePath } from './is-active-path';

describe('isActivePath', () => {
  it('같은 경로면 활성', () => {
    expect(isActivePath('/cleaning', '/cleaning')).toBe(true);
  });

  it('하위 경로도 활성', () => {
    expect(isActivePath('/cleaning/tasks/123', '/cleaning')).toBe(true);
  });

  it('이름이 같은 접두어로 시작하는 다른 경로는 비활성', () => {
    expect(isActivePath('/cleaning-old', '/cleaning')).toBe(false);
  });

  it('다른 메뉴 경로는 비활성', () => {
    expect(isActivePath('/cooking', '/cleaning')).toBe(false);
  });

  it("'/'는 정확히 같을 때만 활성", () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/cleaning', '/')).toBe(false);
  });
});
