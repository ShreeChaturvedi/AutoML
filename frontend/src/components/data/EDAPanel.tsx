/**
 * EDAPanel - Comprehensive Exploratory Data Analysis Panel
 * 
 * Displays:
 * - Data quality overview
 * - Numeric column statistics with visualizations
 * - Categorical column distributions
 * - Correlation analysis
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HistogramChart } from './HistogramChart';
import { ScatterChart } from './ScatterChart';
import { CorrelationMatrix } from './CorrelationMatrix';
import { NumericSummaryCards } from './NumericSummaryCards';
import { CategoricalSummaryGrid } from './CategoricalChart';
import { DataQualityPanel } from './DataQualityPanel';
import { BarChart3, GitBranch, Hash, Layers, Type } from 'lucide-react';
import type { EdaSummary } from '@/types/file';
import { cn } from '@/lib/utils';

interface EDAPanelProps {
  eda: EdaSummary;
  className?: string;
}

export function EDAPanel({ eda, className }: EDAPanelProps) {
  // Handle potentially undefined arrays with safe defaults
  const numericColumns = eda.numericColumns ?? [];
  const categoricalColumns = eda.categoricalColumns ?? [];
  const dataQuality = eda.dataQuality ?? [];
  const correlations = eda.correlations ?? [];

  const hasNumeric = numericColumns.length > 0;
  const hasCategorical = categoricalColumns.length > 0;
  const hasCorrelations = correlations.length > 0;
  const hasQuality = dataQuality.length > 0;

  const numericCount = numericColumns.length;
  const categoricalCount = categoricalColumns.length;

  return (
    <div className={cn('p-4', className)}>
      {/* Summary header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Exploratory Data Analysis</p>
            <p className="text-xs text-muted-foreground">
              {numericCount + categoricalCount} columns analyzed
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          {numericCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Hash className="h-3 w-3" />
              {numericCount} numeric
            </Badge>
          )}
          {categoricalCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Type className="h-3 w-3" />
              {categoricalCount} categorical
            </Badge>
          )}
        </div>
      </div>

      {/* Sub-tabs for EDA sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="distributions" className="gap-1.5 text-xs" disabled={!hasNumeric && !hasCategorical}>
            <BarChart3 className="h-3.5 w-3.5" />
            Distributions
          </TabsTrigger>
          <TabsTrigger value="correlations" className="gap-1.5 text-xs" disabled={!hasCorrelations}>
            <GitBranch className="h-3.5 w-3.5" />
            Correlations
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1.5 text-xs" disabled={!hasQuality}>
            <Hash className="h-3.5 w-3.5" />
            Quality
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="space-y-6">
            {hasNumeric && (
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Numeric Columns
                </h3>
                <NumericSummaryCards columns={numericColumns} />
              </section>
            )}

            {eda.histogram && (
              <section>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Distribution: {eda.histogram.column}
                    </CardTitle>
                    <CardDescription>Histogram showing value distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HistogramChart data={eda.histogram} />
                  </CardContent>
                </Card>
              </section>
            )}

            {hasCategorical && (
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  Categorical Columns
                </h3>
                <CategoricalSummaryGrid columns={categoricalColumns.slice(0, 4)} />
                {categoricalColumns.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Showing 4 of {categoricalColumns.length}. See Distributions for all.
                  </p>
                )}
              </section>
            )}

            {!hasNumeric && !hasCategorical && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium">No analyzable columns found</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="distributions" className="mt-0">
          <div className="space-y-6">
            {eda.histogram && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Distribution: {eda.histogram.column}</CardTitle>
                </CardHeader>
                <CardContent>
                  <HistogramChart data={eda.histogram} height={300} />
                </CardContent>
              </Card>
            )}

            {eda.scatter && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Scatter: {eda.scatter.xColumn} vs {eda.scatter.yColumn}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScatterChart data={eda.scatter} height={300} />
                </CardContent>
              </Card>
            )}

            {hasCategorical && (
              <section>
                <h3 className="text-sm font-semibold mb-3">Categorical Distributions</h3>
                <CategoricalSummaryGrid columns={categoricalColumns} />
              </section>
            )}
          </div>
        </TabsContent>

        <TabsContent value="correlations" className="mt-0">
          <div className="space-y-6">
            {eda.scatter && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{eda.scatter.xColumn} vs {eda.scatter.yColumn}</CardTitle>
                  <CardDescription>Scatter plot showing relationship</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScatterChart data={eda.scatter} height={300} />
                </CardContent>
              </Card>
            )}

            {hasCorrelations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Correlation Analysis</CardTitle>
                  <CardDescription>Pearson correlation coefficients</CardDescription>
                </CardHeader>
                <CardContent>
                  <CorrelationMatrix correlations={correlations} />
                </CardContent>
              </Card>
            )}

            {!hasCorrelations && (
              <div className="text-center py-12 text-muted-foreground">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium">Need at least 2 numeric columns</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quality" className="mt-0">
          {hasQuality ? (
            <DataQualityPanel data={dataQuality} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-medium">No quality data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
