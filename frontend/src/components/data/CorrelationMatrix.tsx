/**
 * CorrelationMatrix - Enhanced correlation visualization with color coding and interpretation
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { CorrelationData } from '@/types/file';
import { cn } from '@/lib/utils';

interface CorrelationMatrixProps {
  correlations: CorrelationData[];
}

function getCorrelationInfo(coef: number): {
  label: string;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative' | 'none';
  color: string;
  bgColor: string;
  Icon: typeof ArrowUpRight;
} {
  const abs = Math.abs(coef);
  const direction = coef > 0.05 ? 'positive' : coef < -0.05 ? 'negative' : 'none';
  
  let strength: 'strong' | 'moderate' | 'weak' | 'none';
  let label: string;
  let color: string;
  let bgColor: string;
  
  if (abs >= 0.7) {
    strength = 'strong';
    label = `Strong ${direction}`;
    color = direction === 'positive' 
      ? 'text-green-700 dark:text-green-400' 
      : 'text-red-700 dark:text-red-400';
    bgColor = direction === 'positive'
      ? 'bg-green-100 dark:bg-green-950/50'
      : 'bg-red-100 dark:bg-red-950/50';
  } else if (abs >= 0.4) {
    strength = 'moderate';
    label = `Moderate ${direction}`;
    color = direction === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-orange-600 dark:text-orange-400';
    bgColor = direction === 'positive'
      ? 'bg-emerald-50 dark:bg-emerald-950/30'
      : 'bg-orange-50 dark:bg-orange-950/30';
  } else if (abs >= 0.2) {
    strength = 'weak';
    label = `Weak ${direction}`;
    color = 'text-muted-foreground';
    bgColor = 'bg-muted/50';
  } else {
    strength = 'none';
    label = 'No correlation';
    color = 'text-muted-foreground';
    bgColor = 'bg-muted/30';
  }

  const Icon = direction === 'positive' ? ArrowUpRight : direction === 'negative' ? ArrowDownRight : Minus;
  
  return { label, strength, direction, color, bgColor, Icon };
}

export function CorrelationMatrix({ correlations }: CorrelationMatrixProps) {
  const { strong, moderate, weak, none } = useMemo(() => {
    const grouped = {
      strong: [] as CorrelationData[],
      moderate: [] as CorrelationData[],
      weak: [] as CorrelationData[],
      none: [] as CorrelationData[]
    };

    correlations.forEach(corr => {
      const info = getCorrelationInfo(corr.coefficient);
      grouped[info.strength].push(corr);
    });

    return grouped;
  }, [correlations]);

  if (correlations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No correlation data available. Need at least 2 numeric columns.
      </div>
    );
  }

  const renderCorrelationCard = (corr: CorrelationData) => {
    const info = getCorrelationInfo(corr.coefficient);
    const Icon = info.Icon;
    
    return (
      <Card key={`${corr.columnA}-${corr.columnB}`} className={cn('overflow-hidden', info.bgColor)}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                <span className="truncate" title={corr.columnA}>{corr.columnA}</span>
                <span className="text-muted-foreground shrink-0">↔</span>
                <span className="truncate" title={corr.columnB}>{corr.columnB}</span>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('flex items-center gap-1 shrink-0', info.color)}>
                  <Icon className="h-4 w-4" />
                  <span className="font-mono font-bold text-lg">
                    {corr.coefficient.toFixed(2)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{info.label}</p>
                <p className="text-xs text-muted-foreground">r = {corr.coefficient.toFixed(4)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-1">
            <Badge variant="secondary" className={cn('text-xs', info.color)}>
              {info.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {strong.length > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
            Strong: {strong.length}
          </Badge>
        )}
        {moderate.length > 0 && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400">
            Moderate: {moderate.length}
          </Badge>
        )}
        {weak.length > 0 && (
          <Badge variant="secondary">
            Weak: {weak.length}
          </Badge>
        )}
        {none.length > 0 && (
          <Badge variant="outline">
            None: {none.length}
          </Badge>
        )}
      </div>

      {/* Strong correlations */}
      {strong.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Strong Correlations
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {strong.map(renderCorrelationCard)}
          </div>
        </div>
      )}

      {/* Moderate correlations */}
      {moderate.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Moderate Correlations
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {moderate.map(renderCorrelationCard)}
          </div>
        </div>
      )}

      {/* Weak and none correlations (collapsed by default for brevity) */}
      {(weak.length > 0 || none.length > 0) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show {weak.length + none.length} weak/no correlations
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...weak, ...none].map(renderCorrelationCard)}
          </div>
        </details>
      )}
    </div>
  );
}
