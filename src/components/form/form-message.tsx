import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { FormState } from '@/lib/form-state';

/** 서버 액션 결과 문구 (성공 · 실패). 아직 제출 전이면 아무것도 그리지 않는다. */
export function FormMessage({ state }: { state: FormState<unknown> }) {
  if (state.ok === null || !state.message) return null;
  const Icon = state.ok ? CircleCheck : CircleAlert;
  return (
    <Alert variant={state.ok ? 'default' : 'destructive'} role={state.ok ? 'status' : 'alert'}>
      <Icon aria-hidden />
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
