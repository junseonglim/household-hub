import { addDays, formatShortDate, type LocalDate } from '@/lib/local-date';
import { MISSABLE_KINDS, type HealthEventKind } from '../constants';

// 일정 상태 · 묶기 · 나누기 (docs/modules/childcare.md 5절 '건강 · 일정'). 순수 함수.

export type ScheduleEventLike = {
  id: string;
  kind: string;
  standardCode: string | null;
  dueDate: LocalDate | null;
  dueUntil: LocalDate | null;
  doneOn: LocalDate | null;
  dismissed: boolean;
};

/**
 * - done: 했음 · dismissed: 해당 없음
 * - missed: 권장 기간이 지났는데 안 함 (접종 · 검진 · 행정만)
 * - due: 지금 할 때 (권장 기간 안, 또는 오늘)
 * - upcoming: 아직 · past: 날짜가 지난 일정 (병원 방문 · 기념일처럼 놓칠 수 없는 것)
 */
export type EventStatus = 'done' | 'dismissed' | 'missed' | 'due' | 'upcoming' | 'past';

export function eventStatus(event: ScheduleEventLike, today: LocalDate): EventStatus {
  if (event.doneOn) return 'done';
  if (event.dismissed) return 'dismissed';
  if (!event.dueDate) return 'upcoming';
  const lastDay = event.dueUntil ?? event.dueDate;
  if (lastDay < today) {
    return MISSABLE_KINDS.includes(event.kind as HealthEventKind) ? 'missed' : 'past';
  }
  return event.dueDate <= today ? 'due' : 'upcoming';
}

export type EventGroup<E> = {
  key: string;
  status: EventStatus;
  dueDate: LocalDate | null;
  dueUntil: LocalDate | null;
  events: E[];
};

const byDue = (a: ScheduleEventLike, b: ScheduleEventLike) =>
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
  (a.dueUntil ?? '').localeCompare(b.dueUntil ?? '');

/**
 * 날짜순으로 줄을 만든다. 같은 기간에 맞히는 표준 접종(DTaP · IPV · Hib …)은 한 줄로 묶는다.
 * 각 접종은 그 줄 안에서 따로 체크할 수 있다 (혼합 백신이면 같이).
 */
export function groupEvents<E extends ScheduleEventLike>(
  events: E[],
  today: LocalDate,
): EventGroup<E>[] {
  const groups: EventGroup<E>[] = [];
  const byKey = new Map<string, EventGroup<E>>();
  for (const event of [...events].sort(byDue)) {
    const status = eventStatus(event, today);
    const groupable = event.kind === 'vaccination' && event.standardCode && status !== 'done';
    const key = groupable
      ? `vaccination|${event.dueDate}|${event.dueUntil}|${status}`
      : `event|${event.id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.events.push(event);
      continue;
    }
    const group = {
      key,
      status,
      dueDate: event.dueDate,
      dueUntil: event.dueUntil,
      events: [event],
    };
    byKey.set(key, group);
    groups.push(group);
  }
  return groups;
}

/** 묶지 않고 하나씩 (지난 일정 목록) */
export function singleGroups<E extends ScheduleEventLike>(
  events: E[],
  today: LocalDate,
): EventGroup<E>[] {
  return events.map((event) => ({
    key: `event|${event.id}`,
    status: eventStatus(event, today),
    dueDate: event.dueDate,
    dueUntil: event.dueUntil,
    events: [event],
  }));
}

/** '다가오는 일정'으로 펼쳐 보여 줄 기간. 그 뒤는 접어 둔다 */
export const SOON_DAYS = 60;

export type ScheduleView<E> = {
  missed: EventGroup<E>[];
  due: EventGroup<E>[];
  soon: EventGroup<E>[];
  later: EventGroup<E>[];
  /** 한 날 최근순 */
  done: E[];
  /** 날짜가 지난 일정 (놓침 아님) 최근순 */
  past: E[];
  dismissed: E[];
};

export function buildScheduleView<E extends ScheduleEventLike>(
  events: E[],
  today: LocalDate,
): ScheduleView<E> {
  const groups = groupEvents(events, today);
  const soonUntil = addDays(today, SOON_DAYS);
  const withStatus = (status: EventStatus) =>
    events.filter((event) => eventStatus(event, today) === status);
  const latestFirst = (key: 'doneOn' | 'dueDate') => (a: E, b: E) =>
    (b[key] ?? '').localeCompare(a[key] ?? '');

  return {
    missed: groups.filter((group) => group.status === 'missed'),
    due: groups.filter((group) => group.status === 'due'),
    soon: groups.filter(
      (group) => group.status === 'upcoming' && (!group.dueDate || group.dueDate <= soonUntil),
    ),
    later: groups.filter(
      (group) => group.status === 'upcoming' && !!group.dueDate && group.dueDate > soonUntil,
    ),
    done: withStatus('done').sort(latestFirst('doneOn')),
    past: withStatus('past').sort(latestFirst('dueDate')),
    dismissed: withStatus('dismissed').sort(byDue),
  };
}

/** 오늘 화면에 보여 줄 가까운 일정: 놓친 것 → 지금 할 것 → 다가오는 것 순으로 몇 줄만 */
export function upcomingHighlights<E extends ScheduleEventLike>(
  events: E[],
  today: LocalDate,
  limit: number,
): EventGroup<E>[] {
  const view = buildScheduleView(events, today);
  return [...view.missed, ...view.due, ...view.soon, ...view.later].slice(0, limit);
}

/** 연도가 오늘과 다르면 연도를 붙인다: '5/14 (금)' · '2031년 3/14 (금)' */
export function formatEventDate(date: LocalDate, today: LocalDate): string {
  const short = formatShortDate(date);
  return date.slice(0, 4) === today.slice(0, 4) ? short : `${date.slice(0, 4)}년 ${short}`;
}

/** 기간이 있으면 '5/14 (금) ~ 6/13 (일)', 없으면 그 날짜 */
export function describeWindow(
  window: { dueDate: LocalDate | null; dueUntil: LocalDate | null },
  today: LocalDate,
): string {
  if (!window.dueDate) return '날짜 미정';
  const from = formatEventDate(window.dueDate, today);
  if (!window.dueUntil || window.dueUntil === window.dueDate) return from;
  return `${from} ~ ${formatEventDate(window.dueUntil, today)}`;
}
