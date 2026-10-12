'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { MemberChip } from '@/modules/core/household/components/member-chip';
import type { ActiveMember } from '@/modules/core/household/queries';
import { CompleteDialog } from './complete-dialog';
import { useQuickComplete } from './use-complete-task';

export type TaskRowData = {
  id: string;
  title: string;
  nextDueDate: string | null;
  /** 이미 끝난 1회성 할 일 */
  done: boolean;
  /** '🛁 욕실 · 3일 지남 · 매주 토' 처럼 이어 붙일 조각. urgent는 강조(밀림) */
  meta: { text: string; urgent?: boolean }[];
  assignee: { displayName: string; color: string } | null;
};

type TaskRowProps = {
  task: TaskRowData;
  members: ActiveMember[];
  myMemberId: string;
  timezone: string;
};

/** 할 일 한 줄: [○ 완료] 제목 · 정보 [담당] [⋯] */
export function TaskRow({ task, members, myMemberId, timezone }: TaskRowProps) {
  const titleId = useId();
  const { done: optimisticDone, pending, complete } = useQuickComplete(task);
  const done = task.done || optimisticDone;

  return (
    <li className="flex items-center gap-2 py-2.5" aria-labelledby={titleId}>
      <button
        type="button"
        onClick={complete}
        disabled={done || pending}
        aria-label={done ? `${task.title} 완료됨` : `${task.title} 완료`}
        className="group flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
      >
        <span
          className={cn(
            'flex size-6 items-center justify-center rounded-full border-2 border-muted-foreground/40 transition-colors group-hover:border-primary',
            done && 'border-primary bg-primary text-primary-foreground',
          )}
        >
          <Check
            className={cn(
              'size-3.5 opacity-0 transition-opacity group-hover:opacity-40',
              done && 'opacity-100 group-hover:opacity-100',
            )}
            strokeWidth={3}
            aria-hidden
          />
        </span>
      </button>
      <Link
        href={`/cleaning/tasks/${task.id}` as Route}
        className="min-w-0 flex-1 rounded-md py-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <p
          id={titleId}
          className={cn(
            'truncate font-medium',
            done && 'text-muted-foreground line-through decoration-1',
          )}
        >
          {task.title}
        </p>
        {task.meta.length > 0 && (
          <p className="truncate text-sm text-muted-foreground">
            {task.meta.map((part, index) => (
              <span key={index}>
                {index > 0 && ' · '}
                <span className={cn(part.urgent && 'font-medium text-destructive')}>
                  {part.text}
                </span>
              </span>
            ))}
          </p>
        )}
      </Link>
      <MemberChip member={task.assignee} />
      {task.done ? (
        <span className="size-9 shrink-0" aria-hidden />
      ) : (
        <CompleteDialog task={task} members={members} myMemberId={myMemberId} timezone={timezone} />
      )}
    </li>
  );
}
