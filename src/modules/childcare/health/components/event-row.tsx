import { Fragment } from 'react';
import { diffDays, formatTimeOfDay, type LocalDate } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { describeDaysUntil } from '@/modules/core/task/recurrence';
import { CUSTOM_EVENT_KINDS, HEALTH_EVENT_KIND_ICONS, type HealthEventKind } from '../../constants';
import type { ScheduleEvent } from '../queries';
import { standardInfo } from '../standard-schedule';
import { describeWindow, formatEventDate, type EventGroup, type EventStatus } from '../status';
import { CompleteDialog } from './complete-dialog';
import { DoneRecordDialog, RestoreEventButton } from './done-record-dialog';
import { EventDialog } from './event-dialog';

/** '놓침 · 5일 지남' · '12일 남음' · '3일 뒤' */
function describeStatus(group: EventGroup<ScheduleEvent>, today: LocalDate): string | null {
  const { status, dueDate, dueUntil } = group;
  const lastDay = dueUntil ?? dueDate;
  if (!dueDate || !lastDay) return null;
  switch (status) {
    case 'missed':
      return `놓침 · ${diffDays(today, lastDay)}일 지남`;
    case 'due':
      if (lastDay === today) return dueDate === today ? '오늘' : '오늘까지';
      return `${diffDays(lastDay, today)}일 남음`;
    case 'upcoming':
      return describeDaysUntil(dueDate, today);
    case 'past':
      return '지남';
    default:
      return null;
  }
}

const STATUS_COLORS: Partial<Record<EventStatus, string>> = {
  missed: 'text-destructive font-medium',
  due: 'text-primary font-medium',
};

/**
 * 일정 한 줄. 같은 기간에 맞히는 접종은 묶여서 한 줄로 보이고, [했어요] 창에서 함께 기록한다.
 * 한 일정은 기록(한 날 · 장소 · 누가)을, 숨긴 일정은 [되살리기]를 보여 준다.
 */
export function EventGroupRow({
  group,
  today,
}: {
  group: EventGroup<ScheduleEvent>;
  today: LocalDate;
}) {
  const first = group.events[0]!;
  const kind = first.kind as HealthEventKind;
  const titles = group.events.map((event) => event.title).join(' · ');
  const { timing } = standardInfo(first.standardCode);
  const hints = [
    ...new Set(group.events.map((event) => standardInfo(event.standardCode).hint)),
  ].filter(Boolean);
  const isCustom = first.standardCode === null;
  const statusText = group.status === 'done' ? null : describeStatus(group, today);
  const metaParts = [
    { text: timing },
    { text: describeWindow(group, today) },
    { text: statusText, className: STATUS_COLORS[group.status] },
  ].filter((part): part is { text: string; className?: string } => Boolean(part.text));

  let detail: React.ReactNode = null;
  let actions: React.ReactNode = null;
  if (group.status === 'done') {
    detail = (
      <p className="text-sm">
        ✓{' '}
        {[formatEventDate(first.doneOn!, today), first.place, first.doneByName]
          .filter(Boolean)
          .join(' · ')}
      </p>
    );
    actions = <DoneRecordDialog event={first} today={today} />;
  } else if (group.status === 'dismissed') {
    detail = <p className="text-sm text-muted-foreground">해당 없음</p>;
    actions = <RestoreEventButton eventId={first.id} title={first.title} />;
  } else {
    const canComplete = kind !== 'celebration';
    actions = (
      <>
        {canComplete && <CompleteDialog events={group.events} today={today} />}
        {isCustom && (CUSTOM_EVENT_KINDS as readonly string[]).includes(kind) && (
          <EventDialog mode="edit" event={first} />
        )}
      </>
    );
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3" aria-label={titles}>
      <span aria-hidden className="pt-0.5 text-lg leading-6">
        {HEALTH_EVENT_KIND_ICONS[kind] ?? '📅'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium break-keep">{titles}</p>
        {/* 날짜가 줄 중간에서 끊기지 않게 조각마다 묶는다 */}
        <p className="text-sm text-muted-foreground">
          {metaParts.map((part, index) => (
            <Fragment key={index}>
              {index > 0 && ' · '}
              <span className={cn('whitespace-nowrap', part.className)}>{part.text}</span>
            </Fragment>
          ))}
        </p>
        {group.status !== 'done' && (first.time || first.place) && (
          <p className="text-sm text-muted-foreground">
            {[first.time && formatTimeOfDay(first.time), first.place].filter(Boolean).join(' · ')}
          </p>
        )}
        {detail}
        {first.note && group.events.length === 1 && (
          <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">{first.note}</p>
        )}
        {group.status !== 'done' &&
          hints.map((hint) => (
            <p key={hint} className="mt-0.5 text-xs text-muted-foreground">
              {hint}
            </p>
          ))}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  );
}

/** 일정 묶음 목록 (제목이 있는 칸) */
export function EventSection({
  title,
  groups,
  today,
  tone,
}: {
  title: string;
  groups: EventGroup<ScheduleEvent>[];
  today: LocalDate;
  tone?: 'warning';
}) {
  if (groups.length === 0) return null;
  const count = groups.reduce((sum, group) => sum + group.events.length, 0);
  return (
    <section aria-label={title}>
      <h2
        className={cn(
          'mb-2 text-sm font-semibold text-muted-foreground',
          tone === 'warning' && 'text-destructive',
        )}
      >
        {title} {count}
      </h2>
      <ul
        className={cn(
          'divide-y rounded-xl border',
          tone === 'warning' && 'border-destructive/40 bg-destructive/[0.03]',
        )}
      >
        {groups.map((group) => (
          <EventGroupRow key={group.key} group={group} today={today} />
        ))}
      </ul>
    </section>
  );
}
