import { z } from 'zod';

/**
 * 폼 서버 액션의 결과. useActionState와 함께 쓴다.
 * - ok: null이면 아직 제출 전
 * - values: 오류가 났을 때 입력값을 되살리기 위한 값 (비밀번호는 넣지 않는다)
 */
export type FormState<T = undefined> = {
  ok: boolean | null;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
  data?: T;
};

export const initialFormState: FormState = { ok: null };

export function success<T = undefined>(message?: string, data?: T): FormState<T> {
  return { ok: true, message, data };
}

export function failure<T = never>(
  message: string,
  extra: Omit<FormState, 'ok' | 'message'> = {},
): FormState<T> {
  return { ok: false, message, ...extra };
}

/** Zod 검증 실패를 필드별 첫 번째 오류 메시지로 바꾼다 */
export function invalidInput<T = never>(
  error: z.ZodError,
  values?: Record<string, string>,
): FormState<T> {
  const { fieldErrors } = z.flattenError(error);
  const firstErrors = Object.fromEntries(
    Object.entries(fieldErrors as Record<string, string[] | undefined>).flatMap(
      ([field, messages]) => (messages?.[0] ? [[field, messages[0]]] : []),
    ),
  );
  return { ok: false, message: '입력한 내용을 확인해 주세요.', fieldErrors: firstErrors, values };
}

/** FormData를 문자열 객체로 바꾼다 (파일 입력은 무시) */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

/** 오류 시 되살릴 값만 고른다 (비밀번호 등 민감한 값 제외) */
export function pick(values: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(
    keys.flatMap((key) => (key in values ? [[key, values[key] ?? '']] : [])),
  );
}
