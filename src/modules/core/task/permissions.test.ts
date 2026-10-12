import { describe, expect, it } from 'vitest';
import { canArchiveTask } from './permissions';

describe('할 일 보관 권한', () => {
  const task = { createdByMemberId: 'member-a' };

  it('관리자 이상은 누가 만든 할 일이든 보관할 수 있다', () => {
    expect(canArchiveTask({ id: 'owner', role: 'owner' }, task)).toBe(true);
    expect(canArchiveTask({ id: 'admin', role: 'admin' }, task)).toBe(true);
  });

  it('구성원은 자기가 만든 할 일만 보관할 수 있다', () => {
    expect(canArchiveTask({ id: 'member-a', role: 'member' }, task)).toBe(true);
    expect(canArchiveTask({ id: 'member-b', role: 'member' }, task)).toBe(false);
  });
});
