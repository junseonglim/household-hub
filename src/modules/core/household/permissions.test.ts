import { describe, expect, it } from 'vitest';
import { canAdminister, canManageMember, canResetPassword, hasRole } from './permissions';

const owner = { id: 'o', role: 'owner', status: 'active' };
const admin = { id: 'a', role: 'admin', status: 'active' };
const admin2 = { id: 'a2', role: 'admin', status: 'active' };
const member = { id: 'm', role: 'member', status: 'active' };
const pending = { id: 'p', role: 'member', status: 'pending' };
const removed = { id: 'r', role: 'member', status: 'removed' };

describe('hasRole', () => {
  it('높은 역할은 낮은 역할의 권한을 포함한다', () => {
    expect(hasRole('owner', 'admin')).toBe(true);
    expect(hasRole('admin', 'admin')).toBe(true);
    expect(hasRole('member', 'admin')).toBe(false);
  });

  it('알 수 없는 역할은 권한이 없다', () => {
    expect(hasRole('superuser', 'member')).toBe(false);
  });
});

describe('canAdminister', () => {
  it('owner · admin만 가능', () => {
    expect(canAdminister(owner)).toBe(true);
    expect(canAdminister(admin)).toBe(true);
    expect(canAdminister(member)).toBe(false);
  });
});

describe('canManageMember (역할 변경 · 내보내기)', () => {
  it('owner는 admin · member를 관리할 수 있다', () => {
    expect(canManageMember(owner, admin)).toBe(true);
    expect(canManageMember(owner, member)).toBe(true);
  });

  it('admin은 다른 admin · member를 관리할 수 있지만 owner는 안 된다', () => {
    expect(canManageMember(admin, admin2)).toBe(true);
    expect(canManageMember(admin, member)).toBe(true);
    expect(canManageMember(admin, owner)).toBe(false);
  });

  it('자기 자신은 관리할 수 없다', () => {
    expect(canManageMember(owner, owner)).toBe(false);
    expect(canManageMember(admin, admin)).toBe(false);
  });

  it('member는 아무도 관리할 수 없다', () => {
    expect(canManageMember(member, member)).toBe(false);
  });

  it('승인 대기 · 내보낸 구성원은 대상이 아니다', () => {
    expect(canManageMember(owner, pending)).toBe(false);
    expect(canManageMember(owner, removed)).toBe(false);
  });
});

describe('canResetPassword', () => {
  it('admin은 owner의 비밀번호도 초기화할 수 있다', () => {
    expect(canResetPassword(admin, owner)).toBe(true);
  });

  it('자기 자신 · 비활성 구성원은 대상이 아니다', () => {
    expect(canResetPassword(admin, admin)).toBe(false);
    expect(canResetPassword(owner, pending)).toBe(false);
  });

  it('member는 초기화할 수 없다', () => {
    expect(canResetPassword(member, admin)).toBe(false);
  });
});
