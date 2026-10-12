'use client';

import { startTransition, useActionState } from 'react';

/**
 * useActionState와 같지만, 제출한 뒤에 폼을 초기화하지 않는다.
 * React는 폼 액션이 끝나면 입력 칸을 처음 값으로 되돌리는데, 상태로 관리하는 칸(반복 고르기 등)이 있으면
 * 화면에 보이는 선택과 상태가 어긋난다. 그래서 제출을 직접 넘겨 초기화를 건너뛴다.
 * 자바스크립트가 아직 안 올라왔을 때는 action으로 그대로 제출된다.
 */
export function usePersistentFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  };

  return [state, { action: formAction, onSubmit }, pending] as const;
}
