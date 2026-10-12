'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  /** 처리 중에 보여 줄 문구 */
  pendingLabel?: string;
  /** 폼 상태로 알 수 없을 때 직접 넘기는 처리 중 여부 (usePersistentFormAction) */
  pending?: boolean;
};

/** 폼 제출 버튼. 처리 중에는 눌리지 않는다 (같은 요청이 두 번 가지 않도록). */
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingProp = false,
  disabled,
  ...props
}: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = status.pending || pendingProp;
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
