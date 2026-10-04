'use client';

import { useActionState, useId } from 'react';
import { ConfirmActionButton } from '@/components/form/confirm-action-button';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initialFormState } from '@/lib/form-state';
import { approveMemberAction, rejectMemberAction } from '../actions';
import { ColorPicker } from './color-picker';

type PendingMember = {
  id: string;
  name: string;
  email: string;
  displayName: string;
  color: string;
  joinedLabel: string;
};

/** 가입 승인 대기자 한 명. 호칭 · 역할 · 색을 정해 승인하거나 거절한다. */
export function PendingMemberCard({ member }: { member: PendingMember }) {
  const roleId = useId();
  const formId = useId();
  const [state, formAction, pending] = useActionState(approveMemberAction, initialFormState);

  return (
    <Card role="region" aria-label={`${member.name}님의 가입 요청`}>
      <CardHeader>
        <CardTitle>{member.name}</CardTitle>
        <CardDescription>
          {member.email} · {member.joinedLabel} 가입
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id={formId} action={formAction} noValidate className="flex flex-col gap-5">
          <input type="hidden" name="memberId" value={member.id} />
          <FormMessage state={state} />
          <FieldGroup>
            <TextField
              label="호칭"
              name="displayName"
              description="가족끼리 부르는 이름 (예: 아빠, 할머니)"
              defaultValue={state.values?.displayName ?? member.displayName}
              error={state.fieldErrors?.displayName}
            />
            <Field>
              <FieldLabel htmlFor={roleId}>역할</FieldLabel>
              <NativeSelect id={roleId} name="role" defaultValue="member" className="w-full">
                <NativeSelectOption value="member">구성원</NativeSelectOption>
                <NativeSelectOption value="admin">관리자</NativeSelectOption>
              </NativeSelect>
              <FieldDescription>관리자는 가입 승인과 구성원 관리를 할 수 있어요.</FieldDescription>
            </Field>
            <Field>
              <FieldTitle>색</FieldTitle>
              <ColorPicker defaultValue={member.color} />
            </Field>
          </FieldGroup>
        </form>
        {/* 거절 버튼은 자기 폼을 따로 가지므로, 승인 버튼은 form 속성으로 위 폼을 제출한다 */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="submit" form={formId} disabled={pending} aria-busy={pending}>
            {pending ? '승인하는 중…' : '승인'}
          </Button>
          <ConfirmActionButton
            action={rejectMemberAction}
            fields={{ memberId: member.id }}
            triggerLabel="거절"
            title={`${member.name}님의 가입을 거절할까요?`}
            description="모르는 사람이라면 거절해 주세요. 이 계정은 삭제돼요."
            confirmLabel="거절하고 삭제"
            destructive
            triggerSize="default"
          />
        </div>
      </CardContent>
    </Card>
  );
}
