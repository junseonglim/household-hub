'use client';

import { KeyRound } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { ConfirmActionButton } from '@/components/form/confirm-action-button';
import { FormMessage } from '@/components/form/form-message';
import { SubmitButton } from '@/components/form/submit-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initialFormState, type FormState } from '@/lib/form-state';
import { changeRoleAction, removeMemberAction, resetPasswordAction } from '../actions';
import { isRole, ROLE_LABELS } from '../permissions';
import { MemberAvatar } from './member-avatar';

type MemberRowProps = {
  member: {
    id: string;
    displayName: string;
    color: string;
    role: string;
    name: string;
    email: string;
    isMe: boolean;
  };
  canManage: boolean;
  canResetPassword: boolean;
};

export function MemberRow({ member, canManage, canResetPassword }: MemberRowProps) {
  const nameId = useId();
  const [roleState, roleAction] = useActionState(changeRoleAction, initialFormState);
  const roleLabel = isRole(member.role) ? ROLE_LABELS[member.role] : member.role;

  return (
    <li className="flex flex-col gap-3 py-4" aria-labelledby={nameId}>
      <div className="flex items-center gap-3">
        <MemberAvatar displayName={member.displayName} color={member.color} />
        <div className="min-w-0 flex-1">
          <p id={nameId} className="font-medium">
            {member.displayName}
            {member.isMe && <span className="text-muted-foreground"> (나)</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {member.name} · {member.email}
          </p>
        </div>
        <Badge variant={member.role === 'member' ? 'secondary' : 'default'}>{roleLabel}</Badge>
      </div>

      {(canManage || canResetPassword) && (
        <div className="flex flex-col gap-2 pl-12">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <form action={roleAction} className="flex items-center gap-2">
                <input type="hidden" name="memberId" value={member.id} />
                <NativeSelect
                  name="role"
                  size="sm"
                  defaultValue={member.role}
                  aria-label={`${member.displayName}의 역할`}
                >
                  <NativeSelectOption value="member">구성원</NativeSelectOption>
                  <NativeSelectOption value="admin">관리자</NativeSelectOption>
                </NativeSelect>
                <SubmitButton size="sm" variant="outline" pendingLabel="저장 중…">
                  역할 저장
                </SubmitButton>
              </form>
            )}
            {canResetPassword && (
              <ConfirmActionButton
                action={resetPasswordAction}
                fields={{ memberId: member.id }}
                triggerLabel="비밀번호 초기화"
                title={`${member.displayName}의 비밀번호를 초기화할까요?`}
                description="임시 비밀번호를 만들어 드려요. 지금 로그인된 기기에서는 모두 로그아웃돼요."
                confirmLabel="초기화"
                renderResult={(state) => <TempPasswordResult state={state} />}
              />
            )}
            {canManage && (
              <ConfirmActionButton
                action={removeMemberAction}
                fields={{ memberId: member.id }}
                triggerLabel="내보내기"
                title={`${member.displayName}님을 내보낼까요?`}
                description="더 이상 우리집에 들어올 수 없게 돼요. 남긴 기록은 그대로 남아요."
                confirmLabel="내보내기"
                destructive
              />
            )}
          </div>
          <FormMessage state={roleState} />
        </div>
      )}
    </li>
  );
}

/** 임시 비밀번호는 한 번만 보여 준다 */
function TempPasswordResult({ state }: { state: FormState<{ tempPassword: string }> }) {
  const [copied, setCopied] = useState(false);
  const tempPassword = state.ok ? state.data?.tempPassword : undefined;
  if (!tempPassword) return <FormMessage state={state} />;

  return (
    <Alert role="status" className="w-full">
      <KeyRound aria-hidden />
      <AlertTitle>임시 비밀번호</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <code
            data-testid="temp-password"
            className="rounded bg-muted px-2 py-1 font-mono text-base text-foreground"
          >
            {tempPassword}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(tempPassword);
              setCopied(true);
            }}
          >
            {copied ? '복사했어요' : '복사'}
          </Button>
        </span>
        <span>
          이 비밀번호를 직접 전해 주세요. 이 화면을 벗어나면 다시 볼 수 없어요. 로그인하면
          비밀번호를 바꾸도록 안내돼요.
        </span>
      </AlertDescription>
    </Alert>
  );
}
