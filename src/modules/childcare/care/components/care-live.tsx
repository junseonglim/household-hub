'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { initialFormState, type FormState } from '@/lib/form-state';
import { localDateOf, type LocalDate } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { BREAST_SIDE_LABELS, CARE_LOG_ICONS, type BreastSide } from '../../constants';
import { stopTimerAction } from '../actions';
import {
  describeCareRecord,
  durationMinutes,
  formatClock,
  formatDayTime,
  formatDuration,
  formatElapsed,
  isRunning,
  STALE_TIMER_MINUTES,
  type CareRecord,
} from '../logic';
import { CareEditButton } from './care-edit-dialog';
import { useNow } from './care-fields';

// 시간이 흐르면 바뀌는 부분 (진행 중 타이머 · 마지막 수유 경과 · 타임라인). 30초마다 다시 그린다.

/** 진행 중인 수면 · 직수 카드. 다른 가족 화면에도 보인다 (새로 들어오면 갱신) */
export function RunningTimers({
  records,
  timezone,
  serverNow,
}: {
  records: CareRecord[];
  timezone: string;
  serverNow: number;
}) {
  const now = useNow(serverNow);
  if (records.length === 0) return null;
  return (
    <section aria-label="진행 중" className="flex flex-col gap-2">
      {records.map((record) => {
        const minutes = durationMinutes(record, now);
        const stale = minutes >= STALE_TIMER_MINUTES;
        const isSleep = record.type === 'sleep';
        const side = (record.details as { side?: BreastSide }).side;
        const title = isSleep ? '자는 중' : `모유 ${side ? BREAST_SIDE_LABELS[side] : ''} 먹는 중`;
        return (
          <div
            key={record.id}
            aria-label={title}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/[0.06] px-4 py-3',
              stale && 'border-destructive/50 bg-destructive/[0.04]',
            )}
          >
            <span aria-hidden className="text-2xl">
              ⏱
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {title} <span className="text-primary">{formatDuration(minutes)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {formatClock(record.startedAt, timezone)}부터
                {record.recordedByName && ` · ${record.recordedByName}`}
              </p>
              {stale && (
                <p className="text-sm text-destructive">
                  24시간이 넘었어요. 끝난 시각을 넣어 주세요.
                </p>
              )}
            </div>
            {stale ? (
              <CareEditButton
                record={record}
                timezone={timezone}
                className="shrink-0 rounded-md border px-3 py-2 text-sm"
              >
                끝 시각 넣기
              </CareEditButton>
            ) : (
              <StopButton logId={record.id} label={isSleep ? '깼어요' : '끝'} />
            )}
          </div>
        );
      })}
    </section>
  );
}

function StopButton({ logId, label }: { logId: string; label: string }) {
  const [, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await stopTimerAction(prev, formData);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, initialFormState);
  return (
    <form action={formAction}>
      <input type="hidden" name="logId" value={logId} />
      <Button type="submit" className="h-11 px-5" disabled={pending}>
        {label}
      </Button>
    </form>
  );
}

/** 마지막 수유 (몇 시간 전 · 무엇 · 다음 쪽) · 마지막 대변 */
export function CareStatusPanel({
  lastFeeding,
  nextSide,
  lastPoop,
  timezone,
  today,
  serverNow,
}: {
  lastFeeding: CareRecord | null;
  nextSide: BreastSide | null;
  lastPoop: CareRecord | null;
  timezone: string;
  today: LocalDate;
  serverNow: number;
}) {
  const now = useNow(serverNow);
  return (
    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 rounded-xl border px-4 py-3 text-sm">
      <dt className="text-muted-foreground">마지막 수유</dt>
      <dd aria-label="마지막 수유">
        {lastFeeding ? (
          <>
            {/* 먹는 중이면 '모유 왼쪽 · 먹는 중'만 */}
            {!isRunning(lastFeeding) && (
              <>
                <span className="font-semibold">{formatElapsed(lastFeeding.startedAt, now)}</span>
                {' · '}
              </>
            )}
            {describeCareRecord(lastFeeding, now)}
            {nextSide && (
              <span className="text-primary"> → 다음은 {BREAST_SIDE_LABELS[nextSide]}</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">아직 없어요</span>
        )}
      </dd>
      <dt className="text-muted-foreground">마지막 대변</dt>
      <dd aria-label="마지막 대변">
        {lastPoop ? (
          formatDayTime(lastPoop.startedAt, timezone, today)
        ) : (
          <span className="text-muted-foreground">아직 없어요</span>
        )}
      </dd>
    </dl>
  );
}

/** 하루 기록 (최근 것이 위). 줄을 누르면 고치기 · 지우기 */
export function CareTimeline({
  records,
  timezone,
  date,
  serverNow,
}: {
  records: CareRecord[];
  timezone: string;
  date: LocalDate;
  serverNow: number;
}) {
  const now = useNow(serverNow);
  const ofDay = records.filter((record) => localDateOf(record.startedAt, timezone) === date);
  if (ofDay.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        이날 기록이 없어요.
      </p>
    );
  }
  return (
    <ol aria-label="기록" className="divide-y rounded-xl border">
      {ofDay.map((record) => {
        const summary = describeCareRecord(record, now);
        const fever =
          record.type === 'temperature' &&
          Number((record.details as { celsius?: number }).celsius) >= 38;
        return (
          <li key={record.id} aria-label={summary}>
            <CareEditButton
              record={record}
              timezone={timezone}
              label={`${formatClock(record.startedAt, timezone)} ${summary} 고치기`}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
            >
              <span className="w-20 shrink-0 pt-0.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                {formatClock(record.startedAt, timezone)}
              </span>
              <span aria-hidden className="pt-0.5">
                {CARE_LOG_ICONS[record.type]}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block', fever && 'font-medium text-destructive')}>
                  {summary}
                  {record.endedAt && record.type === 'sleep' && (
                    <span className="text-sm text-muted-foreground">
                      {' '}
                      ({formatClock(record.endedAt, timezone)}까지)
                    </span>
                  )}
                </span>
                {record.note && (
                  <span className="block text-sm whitespace-pre-line text-muted-foreground">
                    {record.note}
                  </span>
                )}
              </span>
              {record.recordedByName && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {record.recordedByName}
                </span>
              )}
            </CareEditButton>
          </li>
        );
      })}
    </ol>
  );
}
