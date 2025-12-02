/**
 * DataQualityOverview - Summary cards showing overall data quality metrics
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Columns, 
  Copy,
  Hash,
  Type,
  Calendar,
  ToggleLeft
} from 'lucide-react';
import type { PreprocessingAnalysis } from '@/types/preprocessing';
import { cn } from '@/lib/utils';

interface DataQualityOverviewProps {
  analysis: PreprocessingAnalysis;
  metadata?: {
    tableName: string;
    totalRows: number;
    sampledRows: number;
    samplePercentage: number;
  };
}

const typeIcons: Record<string, typeof Hash> = {
  numeric: Hash,
  categorical: Type,
  datetime: Calendar,
  boolean: ToggleLeft,
  text: Type
};

const typeColors: Record<string, string> = {
  numeric: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  categorical: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  datetime: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  boolean: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  text: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

export function DataQualityOverview({ analysis, metadata }: DataQualityOverviewProps) {
  // Calculate summary stats
  const columnsWithMissing = analysis.columnProfiles.filter(c => c.missingCount > 0).length;
  const avgMissingPct = analysis.columnProfiles.length > 0
    ? analysis.columnProfiles.reduce((acc, c) => acc + c.missingPercentage, 0) / analysis.columnProfiles.length
    : 0;

  // Count by type
  const typeCounts = analysis.columnProfiles.reduce((acc, col) => {
    acc[col.inferredType] = (acc[col.inferredType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Overall health score (simple heuristic)
  const healthScore = Math.max(0, 100 - avgMissingPct - (analysis.duplicateRowCount / Math.max(1, analysis.rowCount)) * 20);
  const healthLabel = healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs Work';
  const healthColor = healthScore >= 90 ? 'text-green-600' : healthScore >= 70 ? 'text-blue-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Main stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Rows</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {metadata ? metadata.totalRows.toLocaleString() : analysis.rowCount.toLocaleString()}
            </div>
            {metadata && metadata.samplePercentage < 100 && (
              <p className="text-xs text-muted-foreground mt-1">
                Sampled: {metadata.sampledRows.toLocaleString()} ({metadata.samplePercentage.toFixed(1)}%)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Columns className="h-4 w-4" />
              <span className="text-xs">Columns</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {analysis.columnCount}
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(typeCounts).map(([type, count]) => {
                const Icon = typeIcons[type] || Hash;
                return (
                  <Badge key={type} variant="secondary" className={cn('text-xs gap-1', typeColors[type])}>
                    <Icon className="h-3 w-3" />
                    {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {avgMissingPct > 10 ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <span className="text-xs">Missing Data</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {avgMissingPct.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {columnsWithMissing} of {analysis.columnCount} columns affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Copy className="h-4 w-4" />
              <span className="text-xs">Duplicates</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {analysis.duplicateRowCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.rowCount > 0 
                ? ((analysis.duplicateRowCount / analysis.rowCount) * 100).toFixed(1)
                : 0}% of rows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health score card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Data Quality Score</p>
              <p className="text-xs text-muted-foreground">
                Based on missing values, duplicates, and column types
              </p>
            </div>
            <div className="text-right">
              <div className={cn('text-3xl font-bold', healthColor)}>
                {Math.round(healthScore)}
              </div>
              <Badge variant="secondary" className={cn('mt-1', healthColor)}>
                {healthLabel}
              </Badge>
            </div>
          </div>
          
          {/* Health bar */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                healthScore >= 90 ? 'bg-green-500' : 
                healthScore >= 70 ? 'bg-blue-500' : 
                healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

