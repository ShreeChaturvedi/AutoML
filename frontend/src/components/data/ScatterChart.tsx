/**
 * ScatterChart - Enhanced scatter plot visualization with trend indicators
 */

import { useMemo } from 'react';
import { 
  ScatterChart as RechartsScatter, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ZAxis,
  ReferenceLine
} from 'recharts';
import { useTheme } from '@/components/theme-provider';
import type { ScatterData } from '@/types/file';

interface ScatterChartProps {
  data: ScatterData;
  height?: number;
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toExponential(1);
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
}

export function ScatterChart({ data, height = 320 }: ScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { stats, correlation } = useMemo(() => {
    const points = data.points;
    if (points.length === 0) return { stats: null, correlation: 0 };

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);

    const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;

    // Calculate Pearson correlation
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - xMean;
      const dy = points[i].y - yMean;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    const corr = denom === 0 ? 0 : numerator / denom;

    return {
      stats: {
        xMin: Math.min(...xValues),
        xMax: Math.max(...xValues),
        yMin: Math.min(...yValues),
        yMax: Math.max(...yValues),
        xMean,
        yMean
      },
      correlation: corr
    };
  }, [data.points]);

  if (data.points.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
        No scatter data available
      </div>
    );
  }

  const getCorrelationColor = (r: number) => {
    const abs = Math.abs(r);
    if (abs > 0.7) return 'text-green-600 dark:text-green-400';
    if (abs > 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const getCorrelationLabel = (r: number) => {
    const abs = Math.abs(r);
    const direction = r > 0 ? 'positive' : 'negative';
    if (abs > 0.7) return `Strong ${direction}`;
    if (abs > 0.4) return `Moderate ${direction}`;
    if (abs > 0.2) return `Weak ${direction}`;
    return 'No correlation';
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsScatter margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))'} 
          />
          <XAxis
            type="number"
            dataKey="x"
            name={data.xColumn}
            tick={{ 
              fontSize: 11, 
              fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' 
            }}
            tickFormatter={formatAxisValue}
            tickLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            axisLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            label={{ 
              value: data.xColumn, 
              position: 'bottom',
              offset: -5,
              style: { 
                fontSize: 12, 
                fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                fontWeight: 500
              }
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.yColumn}
            tick={{ 
              fontSize: 11, 
              fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' 
            }}
            tickFormatter={formatAxisValue}
            tickLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            axisLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            label={{ 
              value: data.yColumn, 
              angle: -90, 
              position: 'insideLeft',
              offset: 10,
              style: { 
                fontSize: 12, 
                fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                fontWeight: 500
              }
            }}
          />
          <ZAxis range={[40, 40]} />
          {/* Mean reference lines */}
          {stats && (
            <>
              <ReferenceLine 
                x={stats.xMean} 
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                y={stats.yMean} 
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            </>
          )}
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    {data.xColumn}: <span className="font-mono font-medium text-foreground">{formatAxisValue(point.x)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {data.yColumn}: <span className="font-mono font-medium text-foreground">{formatAxisValue(point.y)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Scatter
            name="Data Points"
            data={data.points}
            fill="hsl(var(--primary))"
            fillOpacity={0.6}
          />
        </RechartsScatter>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 text-xs text-muted-foreground mt-2">
        <span>Points: <span className="font-mono">{data.points.length.toLocaleString()}</span></span>
        <span className={getCorrelationColor(correlation)}>
          Correlation: <span className="font-mono font-medium">{correlation.toFixed(3)}</span>
          <span className="ml-1">({getCorrelationLabel(correlation)})</span>
        </span>
      </div>
    </div>
  );
}
