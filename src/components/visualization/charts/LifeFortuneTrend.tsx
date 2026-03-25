/**
 * Life Fortune Trend Chart
 *
 * Area chart showing fortune trends across 大运 (10-year periods).
 * The most important visualization chart - shows life fortune trajectory.
 * Uses Recharts AreaChart with gradient fills, multi-dimension toggle,
 * "You are here" marker, hover tooltips, and life highlight section.
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useChartEntrance, CHART_ENTRANCE_BASE, CHART_ENTRANCE_ACTIVE } from '@/components/visualization/shared/useChartEntrance';
import ChartEmpty from '@/components/visualization/shared/ChartEmpty';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Star, MapPin } from 'lucide-react';
import type { FortuneDimensionKey } from '@/lib/visualization/dimensions';
import {
  getDimensionConfig,
  getDimensionsByKeys,
  isDimensionKey,
  DEFAULT_DIMENSIONS,
} from '@/lib/visualization/dimensions';
import { getDimensionColor } from '@/lib/visualization/chart-theme';
import type { LifeFortuneTrendData } from '@/lib/visualization/chart-types';

// ===== Types =====

interface LifeFortuneTrendProps {
  data: LifeFortuneTrendData;
  compact?: boolean;
  selectedDimensions?: FortuneDimensionKey[];
  dayunCount?: number;
}

// Flattened data point for Recharts
interface TrendDataPoint {
  age: number;
  year: number;
  periodLabel: string;
  periodIndex: number;
  summary: string;
  highlights: string[];
  warnings: string[];
  [key: string]: string | number | string[] | undefined;
}

// Tooltip payload from Recharts
interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

// ===== Constants =====

const CHART_HEIGHT_DESKTOP = 300;
const CHART_HEIGHT_COMPACT = 200;
const LOW_SCORE_THRESHOLD = 50;

// ===== Custom Tooltip =====

function TrendTooltip({
  active,
  payload,
  chartData,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
  chartData: TrendDataPoint[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const firstEntry = payload[0];
  if (!firstEntry) return null;

  // Find matching data point from payload
  const point = chartData.find((d) => {
    for (const entry of payload) {
      if (d[entry.dataKey] === entry.value) return true;
    }
    return false;
  }) || chartData[0];

  if (!point) return null;

  return (
    <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg max-w-[260px]">
      <div className="text-sm font-bold mb-1 text-[var(--color-foreground)]">
        {point.periodLabel}
      </div>
      <div className="text-xs text-[var(--color-foreground-secondary)] mb-2">
        {point.age}岁 / {point.year}年
      </div>

      {payload.map((entry) => {
        if (!isDimensionKey(entry.dataKey)) return null;
        const dimConfig = getDimensionConfig(entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm py-0.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--color-foreground-secondary)]">
              {dimConfig.label}:
            </span>
            <span className="font-medium text-[var(--color-foreground)]">
              {Math.round(entry.value)}
            </span>
          </div>
        );
      })}

      {point.summary && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-foreground-secondary)]">
          {point.summary}
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====

function LifeFortuneTrendInner({
  data,
  compact = false,
  selectedDimensions,
  dayunCount = 5,
}: LifeFortuneTrendProps) {
  const { ref, entered } = useChartEntrance();
  const initialDims = selectedDimensions ?? DEFAULT_DIMENSIONS;
  const [activeDimensions, setActiveDimensions] = useState<FortuneDimensionKey[]>(initialDims);

  // Determine available dimensions from the data
  const availableDimensions = useMemo(() => {
    if (!data.data.periods.length) return DEFAULT_DIMENSIONS;
    const allKeys = new Set<FortuneDimensionKey>();
    for (const period of data.data.periods) {
      for (const key of Object.keys(period.scores)) {
        allKeys.add(key as FortuneDimensionKey);
      }
    }
    return Array.from(allKeys);
  }, [data.data.periods]);

  // Dimension toggle handler
  const toggleDimension = useCallback((dim: FortuneDimensionKey) => {
    setActiveDimensions((prev) => {
      if (prev.includes(dim)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((d) => d !== dim);
      }
      return [...prev, dim];
    });
  }, []);

  // Flatten periods into data points for Recharts
  // Each period becomes one data point at its midpoint age
  const { chartData, periodBoundaries, warningZones } = useMemo(() => {
    const periods = data.data.periods.slice(0, dayunCount);
    const points: TrendDataPoint[] = [];
    const boundaries: number[] = [];
    const warnings: Array<{ startAge: number; endAge: number }> = [];

    for (let pIdx = 0; pIdx < periods.length; pIdx++) {
      const period = periods[pIdx];
      boundaries.push(period.startAge);

      // Compute overall from active dimensions for warning zone detection
      const dimKeys = Object.keys(period.scores) as FortuneDimensionKey[];
      const overallScore = dimKeys.length > 0
        ? dimKeys.reduce((sum, k) => sum + (period.scores[k] ?? 0), 0) / dimKeys.length
        : 0;

      if (overallScore < LOW_SCORE_THRESHOLD) {
        warnings.push({ startAge: period.startAge, endAge: period.endAge });
      }

      // If yearlyScores exist, use them for smoother curve
      if (period.yearlyScores && period.yearlyScores.length > 0) {
        for (const ys of period.yearlyScores) {
          const point: TrendDataPoint = {
            age: ys.age,
            year: ys.year,
            periodLabel: period.label,
            periodIndex: pIdx,
            summary: period.summary,
            highlights: period.highlights,
            warnings: period.warnings,
          };
          // Spread dimension scores as top-level keys
          for (const [key, val] of Object.entries(period.scores)) {
            // Scale per-year score relative to overall
            const dimScore = val as number;
            const ratio = ys.overall > 0 ? dimScore / overallScore : 1;
            point[key] = Math.round(ys.overall * ratio);
          }
          points.push(point);
        }
      } else {
        // Single point at midpoint of period
        const midAge = Math.round((period.startAge + period.endAge) / 2);
        const midYear = data.data.currentYear - data.data.currentAge + midAge;
        const point: TrendDataPoint = {
          age: midAge,
          year: midYear,
          periodLabel: period.label,
          periodIndex: pIdx,
          summary: period.summary,
          highlights: period.highlights,
          warnings: period.warnings,
        };
        for (const [key, val] of Object.entries(period.scores)) {
          point[key] = val as number;
        }
        points.push(point);
      }
    }

    // Add last boundary
    const lastPeriod = periods[periods.length - 1];
    if (lastPeriod) {
      boundaries.push(lastPeriod.endAge);
    }

    // Sort by age
    points.sort((a, b) => a.age - b.age);

    return { chartData: points, periodBoundaries: boundaries, warningZones: warnings };
  }, [data, dayunCount]);

  // Current age marker
  const currentAge = data.data.currentAge;

  // Chart height
  const chartHeight = compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT_DESKTOP;

  // Determine Y-axis domain
  const yDomain = useMemo((): [number, number] => {
    let min = 100;
    let max = 0;
    for (const point of chartData) {
      for (const dim of activeDimensions) {
        const val = point[dim];
        if (typeof val === 'number') {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    return [Math.max(0, Math.floor(min / 10) * 10 - 10), Math.min(100, Math.ceil(max / 10) * 10 + 10)];
  }, [chartData, activeDimensions]);

  const { lifeHighlight } = data.data;

  if (chartData.length === 0) {
    return <ChartEmpty message="暂无大运数据" />;
  }

  return (
    <div ref={ref} className={`space-y-4 ${CHART_ENTRANCE_BASE} ${entered ? CHART_ENTRANCE_ACTIVE : ''}`}>
      {/* Title */}
      {!compact && (data.title || data.subtitle) && (
        <div>
          {data.title && (
            <h3 className="text-base font-bold text-[var(--color-foreground)]">{data.title}</h3>
          )}
          {data.subtitle && (
            <p className="text-xs text-[var(--color-foreground-secondary)] mt-0.5">
              {data.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Dimension Toggle Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {getDimensionsByKeys(availableDimensions).map((dim) => {
          const isActive = activeDimensions.includes(dim.key);
          return (
            <button
              key={dim.key}
              onClick={() => toggleDimension(dim.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-md scale-105'
                  : 'bg-[var(--color-background-secondary)] text-[var(--color-foreground-secondary)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-foreground)]'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: getDimensionColor(dim.key),
                      boxShadow: `0 2px 4px ${getDimensionColor(dim.key)}40`,
                    }
                  : undefined
              }
            >
              {dim.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-[var(--color-background-secondary)]/30 border border-[var(--color-border)]/50 rounded-2xl p-3">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {activeDimensions.map((dim) => (
                <linearGradient
                  key={`gradient-${dim}`}
                  id={`gradient-${dim}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={getDimensionColor(dim)}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={getDimensionColor(dim)}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="2 2"
              stroke="var(--color-border)"
              opacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey="age"
              tick={{ fontSize: 10, fill: 'var(--color-foreground-secondary)' }}
              tickLine={false}
              axisLine={false}
              dy={10}
              label={
                compact
                  ? undefined
                  : {
                      value: '年龄',
                      position: 'insideBottomRight',
                      offset: -5,
                      style: { fontSize: 10, fill: 'var(--color-foreground-tertiary)' },
                    }
              }
            />

            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: 'var(--color-foreground-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickCount={5}
            />

            <Tooltip
              content={
                <TrendTooltip
                  chartData={chartData}
                />
              }
              cursor={{
                stroke: 'var(--color-foreground-tertiary)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* Warning zones (low score periods) */}
            {warningZones.map((zone, i) => (
              <ReferenceArea
                key={`warning-${i}`}
                x1={zone.startAge}
                x2={zone.endAge}
                fill="#ef4444"
                fillOpacity={0.05}
                stroke="none"
              />
            ))}

            {/* Period boundary dashed lines */}
            {periodBoundaries.map((age) => (
              <ReferenceLine
                key={`boundary-${age}`}
                x={age}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            ))}

            {/* "You are here" reference line */}
            <ReferenceLine
              x={currentAge}
              stroke="var(--color-accent, #D4AF37)"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: '当前',
                position: 'top',
                fill: 'var(--color-accent, #D4AF37)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* Area layers for each active dimension */}
            {activeDimensions.map((dim, idx) => (
              <Area
                key={dim}
                type="monotone"
                dataKey={dim}
                stroke={getDimensionColor(dim)}
                strokeWidth={idx === 0 ? 2.5 : 2}
                fill={`url(#gradient-${dim})`}
                fillOpacity={idx === 0 ? 1 : 0.5}
                activeDot={{
                  r: 5,
                  fill: getDimensionColor(dim),
                  stroke: 'var(--color-background)',
                  strokeWidth: 2,
                }}
                dot={chartData.length < 12 ? { r: 2.5, fill: getDimensionColor(dim) } : false}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Life Highlight Section */}
      {!compact && lifeHighlight && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Best Period */}
          <div className="bg-[var(--color-background-secondary)]/50 border border-[var(--color-border)]/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-[var(--color-foreground-secondary)]">
                最佳时期
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--color-foreground)]">
              {lifeHighlight.bestPeriod.label}
            </div>
            <div className="text-xs text-[var(--color-foreground-secondary)] mt-0.5">
              {lifeHighlight.bestPeriod.ages}岁
            </div>
            <div className="text-xs text-[var(--color-foreground-tertiary)] mt-1">
              {lifeHighlight.bestPeriod.reason}
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-[var(--color-background-secondary)]/50 border border-[var(--color-border)]/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-accent,#D4AF37)]" />
              <span className="text-xs font-medium text-[var(--color-foreground-secondary)]">
                当前状态
              </span>
            </div>
            <div className="text-sm font-medium text-[var(--color-foreground)]">
              {lifeHighlight.currentStatus}
            </div>
          </div>

          {/* Next Turning Point */}
          <div className="bg-[var(--color-background-secondary)]/50 border border-[var(--color-border)]/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              {lifeHighlight.nextTurningPoint.direction === 'up' ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className="text-xs font-medium text-[var(--color-foreground-secondary)]">
                下一转折
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--color-foreground)]">
              {lifeHighlight.nextTurningPoint.age}岁
            </div>
            <div className="text-xs text-[var(--color-foreground-tertiary)] mt-1">
              {lifeHighlight.nextTurningPoint.reason}
            </div>
          </div>
        </div>
      )}

      {/* Warning indicators for periods with warnings (non-compact only) */}
      {!compact && data.data.periods.some((p) => p.warnings.length > 0) && (
        <div className="flex items-start gap-2 text-xs text-[var(--color-foreground-secondary)] bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {data.data.periods
              .filter((p) => p.warnings.length > 0)
              .slice(0, 3)
              .map((p, i) => (
                <div key={i}>
                  <span className="font-medium text-[var(--color-foreground)]">{p.label}</span>
                  {': '}
                  {p.warnings.join('、')}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const LifeFortuneTrend = LifeFortuneTrendInner;
export default LifeFortuneTrend;
