import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NumericColumnSummary } from '@/types/file';
import { cn } from '@/lib/utils';

interface NumericSummaryCardsProps {
  columns: NumericColumnSummary[];
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}

function getSkewnessLabel(skewness: number): { label: string; icon: typeof TrendingUp; color: string } {
  const absSkew = Math.abs(skewness);
  if (absSkew < 0.5) {
    return { label: 'Symmetric', icon: Minus, color: 'text-green-600 dark:text-green-400' };
  }
  if (skewness > 0) {
    return { 
      label: absSkew > 1 ? 'Highly right-skewed' : 'Right-skewed', 
      icon: TrendingUp, 
      color: absSkew > 1 ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-600 dark:text-yellow-400' 
    };
  }
  return { 
    label: absSkew > 1 ? 'Highly left-skewed' : 'Left-skewed', 
    icon: TrendingDown, 
    color: absSkew > 1 ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-600 dark:text-yellow-400' 
  };
}

export function NumericSummaryCards({ columns }: NumericSummaryCardsProps) {
  if (columns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No numeric columns found in the data.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {columns.map((col) => {
        const skewnessInfo = getSkewnessLabel(col.skewness);
        const SkewIcon = skewnessInfo.icon;
        const hasOutliers = col.outlierCount > 0;

        return (
          <Card key={col.column} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium truncate" title={col.column}>
                  {col.column}
                </CardTitle>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={cn('flex items-center gap-1', skewnessInfo.color)}>
                        <SkewIcon className="h-3.5 w-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{skewnessInfo.label} (skew: {col.skewness.toFixed(2)})</p>
                    </TooltipContent>
                  </Tooltip>
                  {hasOutliers && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="h-5 px-1.5 text-xs gap-1 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          {col.outlierCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{col.outlierCount} outlier{col.outlierCount !== 1 ? 's' : ''} detected (IQR method)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Range visualization */}
              <div className="mb-3 px-1">
                <div className="h-2 bg-muted rounded-full relative overflow-hidden">
                  <div 
                    className="absolute h-full bg-primary/30 rounded-full"
                    style={{ 
                      left: '0%',
                      width: '100%'
                    }}
                  />
                  {/* IQR indicator */}
                  <div 
                    className="absolute h-full bg-primary rounded-full"
                    style={{ 
                      left: `${((col.q1 - col.min) / (col.max - col.min || 1)) * 100}%`,
                      width: `${((col.q3 - col.q1) / (col.max - col.min || 1)) * 100}%`
                    }}
                  />
                  {/* Median marker */}
                  <div 
                    className="absolute w-0.5 h-full bg-foreground"
                    style={{ 
                      left: `${((col.median - col.min) / (col.max - col.min || 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
                  <span>{formatNumber(col.min)}</span>
                  <span>{formatNumber(col.max)}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mean</span>
                  <span className="font-mono font-medium">{formatNumber(col.mean)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Median</span>
                  <span className="font-mono font-medium">{formatNumber(col.median)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Std Dev</span>
                  <span className="font-mono font-medium">{formatNumber(col.stdDev)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IQR</span>
                  <span className="font-mono font-medium">{formatNumber(col.q3 - col.q1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Q1</span>
                  <span className="font-mono font-medium">{formatNumber(col.q1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Q3</span>
                  <span className="font-mono font-medium">{formatNumber(col.q3)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
