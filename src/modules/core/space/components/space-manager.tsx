'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useActionState, useId } from 'react';
import { ConfirmActionButton } from '@/components/form/confirm-action-button';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { initialFormState, type FormState } from '@/lib/form-state';
import {
  archiveSpaceAction,
  createSpaceAction,
  moveSpaceAction,
  updateSpaceAction,
} from '../actions';
import type { SpaceItem } from '../queries';

/** 공간 추가 · 이름 · 아이콘 · 순서 · 보관 (관리자 전용 화면) */
export function SpaceManager({ spaces }: { spaces: SpaceItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-y rounded-xl border">
        {spaces.map((space, index) => (
          <SpaceRow
            key={space.id}
            space={space}
            isFirst={index === 0}
            isLast={index === spaces.length - 1}
          />
        ))}
      </ul>
      <AddSpaceForm />
    </div>
  );
}

function SpaceFields({
  state,
  space,
  nameLabel,
}: {
  state: FormState;
  space?: SpaceItem;
  nameLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-2">
      <Input
        name="icon"
        aria-label={`${nameLabel} 아이콘 (이모지)`}
        defaultValue={state.values?.icon ?? space?.icon ?? ''}
        placeholder="🧹"
        maxLength={16}
        aria-invalid={state.fieldErrors?.icon ? true : undefined}
        className="h-10 w-14 text-center text-lg"
      />
      <Input
        name="name"
        aria-label={`${nameLabel} 이름`}
        defaultValue={state.values?.name ?? space?.name ?? ''}
        placeholder="예: 서재"
        maxLength={10}
        aria-invalid={state.fieldErrors?.name ? true : undefined}
        className="h-10 min-w-0 flex-1"
      />
    </div>
  );
}

function FieldErrors({ state }: { state: FormState }) {
  const messages = Object.values(state.fieldErrors ?? {});
  if (messages.length === 0) return <FormMessage state={state} />;
  return (
    <ul className="text-sm text-destructive">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

function SpaceRow({
  space,
  isFirst,
  isLast,
}: {
  space: SpaceItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const nameId = useId();
  const [state, updateAction] = useActionState(updateSpaceAction, initialFormState);
  const [moveState, moveAction, moving] = useActionState(moveSpaceAction, initialFormState);

  return (
    <li className="flex flex-col gap-2 px-4 py-3" aria-labelledby={nameId}>
      <span id={nameId} className="sr-only">
        {space.name}
      </span>
      <form action={updateAction} noValidate className="flex items-center gap-2">
        <input type="hidden" name="spaceId" value={space.id} />
        <SpaceFields state={state} space={space} nameLabel={space.name} />
        <SubmitButton variant="outline" className="h-10" pendingLabel="저장 중…">
          저장
        </SubmitButton>
      </form>
      <div className="flex items-center gap-1">
        <form action={moveAction} className="flex gap-1">
          <input type="hidden" name="spaceId" value={space.id} />
          <Button
            type="submit"
            name="direction"
            value="up"
            variant="ghost"
            size="icon-sm"
            disabled={isFirst || moving}
            aria-label={`${space.name} 위로`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="submit"
            name="direction"
            value="down"
            variant="ghost"
            size="icon-sm"
            disabled={isLast || moving}
            aria-label={`${space.name} 아래로`}
          >
            <ArrowDown aria-hidden />
          </Button>
        </form>
        <div className="ml-auto">
          <ConfirmActionButton
            action={archiveSpaceAction}
            fields={{ spaceId: space.id }}
            triggerLabel="보관"
            title={`'${space.name}' 공간을 보관할까요?`}
            description="이 공간의 할 일은 '공간 없음'으로 옮겨져요. 할 일과 완료 기록은 그대로 남아요."
            confirmLabel="보관"
            destructive
          />
        </div>
      </div>
      {state.ok !== null && <FieldErrors state={state} />}
      {moveState.ok === false && <FormMessage state={moveState} />}
    </li>
  );
}

function AddSpaceForm() {
  const [state, formAction] = useActionState(createSpaceAction, initialFormState);
  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      <h2 className="font-semibold">공간 추가</h2>
      <div className="flex items-center gap-2">
        <SpaceFields state={state.ok ? initialFormState : state} nameLabel="새 공간" />
        <SubmitButton className="h-10" pendingLabel="추가 중…">
          추가
        </SubmitButton>
      </div>
      {state.ok !== null && <FieldErrors state={state} />}
    </form>
  );
}
