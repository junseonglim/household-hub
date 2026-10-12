import { formatMeasure, monthTicks, type ChartPoint, type GrowthMetric } from '../growth';

// 카드 폭(약 270~340px)과 비슷하게 잡아 글자가 11~12px 정도로 보이게 한다
const WIDTH = 300;
const HEIGHT = 140;
const PAD = { top: 12, right: 14, bottom: 24, left: 38 };

/**
 * 항목 하나의 추이 (가로: 생후 개월, 세로: 값). 백분위 곡선은 이후 (docs/modules/childcare.md 3절).
 * 값은 목록에도 있으므로 그림은 aria-label로 처음 · 마지막 값만 읽어 준다.
 */
export function GrowthChart({
  label,
  metric,
  points,
}: {
  label: string;
  metric: GrowthMetric;
  points: ChartPoint[];
}) {
  if (points.length === 0) return null;
  const first = points[0]!;
  const last = points.at(-1)!;
  const maxDays = Math.max(last.ageDays, 30);
  const values = points.map((point) => point.value);
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const padding = Math.max((max - min) * 0.15, max * 0.03, 0.1);
  const [low, high] = [min - padding, max + padding];

  const x = (days: number) => PAD.left + (days / maxDays) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    PAD.top + (1 - (value - low) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom);
  const yTicks = min === max ? [min] : [min, (min + max) / 2, max];
  const summary =
    points.length === 1
      ? `${label} ${formatMeasure(first.value, metric)}`
      : `${label} ${formatMeasure(first.value, metric)}에서 ${formatMeasure(last.value, metric)}로`;

  return (
    <figure className="rounded-xl border p-3">
      <figcaption className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">{formatMeasure(last.value, metric)}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${summary} (그래프)`}
        className="h-auto w-full text-primary"
      >
        {yTicks.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(value)}
              y2={y(value)}
              className="stroke-border"
              strokeDasharray="3 3"
            />
            <text
              x={PAD.left - 6}
              y={y(value)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {Number(value.toFixed(metric === 'weightKg' ? 1 : 0))}
            </text>
          </g>
        ))}
        {monthTicks(maxDays).map((tick) => (
          <text
            key={tick.days}
            x={x(tick.days)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {tick.label}
          </text>
        ))}
        {points.length > 1 && (
          <polyline
            points={points.map((point) => `${x(point.ageDays)},${y(point.value)}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        {points.map((point) => (
          <circle
            key={`${point.date}-${point.value}`}
            cx={x(point.ageDays)}
            cy={y(point.value)}
            r={3.5}
            fill="currentColor"
          />
        ))}
      </svg>
    </figure>
  );
}
