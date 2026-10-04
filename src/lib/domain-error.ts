/** 사용자에게 그대로 보여 줄 수 있는 업무 규칙 위반 (권한 없음, 대상 없음 등) */
export class DomainError extends Error {
  constructor(
    readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
