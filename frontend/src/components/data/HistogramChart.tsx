/**
 * HistogramChart - Enhanced histogram visualization for numeric distributions
 */

import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useTheme } from '@/components/theme-provider';
import type { HistogramData } from '@/types/file';

interface HistogramChartProps {
  data: HistogramData;
  showMean?: boolean;
  height?: number;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Smart decimal places
  if (Math.abs(value) < 0.01) {
    return value.toExponential(1);
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(3);
  }
  return value.toFixed(1);
}

export function HistogramChart({ data, height = 280 }: HistogramChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { chartData, stats } = useMemo(() => {
    const totalCount = data.buckets.reduce((sum, b) => sum + b.count, 0);
    const maxCount = Math.max(...data.buckets.map(b => b.count));
    
    // Calculate approximate mean from histogram
    const weightedSum = data.buckets.reduce((sum, b) => {
      const midpoint = (b.start + b.end) / 2;
      return sum + midpoint * b.count;
    }, 0);
    const mean = totalCount > 0 ? weightedSum / totalCount : 0;

    const formatted = data.buckets.map((bucket, index) => ({
      range: `${formatNumber(bucket.start)}–${formatNumber(bucket.end)}`,
      rangeStart: bucket.start,
      rangeEnd: bucket.end,
      count: bucket.count,
      percentage: totalCount > 0 ? (bucket.count / totalCount) * 100 : 0,
      index,
      isMode: bucket.count === maxCount && bucket.count > 0
    }));

    return { 
      chartData: formatted, 
      stats: { totalCount, mean, maxCount } 
    };
  }, [data.buckets]);

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No histogram data available
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))'} 
            vertical={false}
          />
          <XAxis
            dataKey="range"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ 
              fontSize: 10, 
              fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' 
            }}
            tickLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            axisLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            interval={0}
          />
          <YAxis 
            tick={{ 
              fontSize: 11, 
              fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' 
            }}
            tickLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            axisLine={{ stroke: isDark ? 'hsl(var(--muted))' : 'hsl(var(--border))' }}
            tickFormatter={(value) => formatNumber(value)}
            label={{ 
              value: 'Count', 
              angle: -90, 
              position: 'insideLeft',
              style: { 
                fontSize: 11, 
                fill: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' 
              }
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-medium mb-1">
                    {formatNumber(item.rangeStart)} – {formatNumber(item.rangeEnd)}
                  </p>
                  <p className="text-muted-foreground">
                    Count: <span className="font-mono font-medium text-foreground">{item.count.toLocaleString()}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Percentage: <span className="font-mono font-medium text-foreground">{item.percentage.toFixed(1)}%</span>
                  </p>
                  {item.isMode && (
                    <p className="text-primary text-xs mt-1 font-medium">Mode bucket</p>
                  )}
                </div>
              );
            }}
          />
          {/* Mean reference line */}
          <ReferenceLine 
            x={chartData.findIndex(d => d.rangeStart <= stats.mean && d.rangeEnd >= stats.mean)}
            stroke="hsl(var(--destructive))"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: `Mean: ${formatNumber(stats.mean)}`, 
              position: 'top',
              fontSize: 10,
              fill: 'hsl(var(--destructive))'
            }}
          />
          <Bar 
            dataKey="count" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
        <span>Total: <span className="font-mono">{stats.totalCount.toLocaleString()}</span></span>
        <span>Buckets: <span className="font-mono">{chartData.length}</span></span>
      </div>
    </div>
  );
}
