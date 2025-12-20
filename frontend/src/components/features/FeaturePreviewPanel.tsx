import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { FeatureSuggestion } from '@/types/featurePlan';
import { buildFeaturePreview } from '@/lib/features/preview';

interface FeaturePreviewPanelProps {
  feature?: FeatureSuggestion;
  rows: Array<Record<string, unknown>>;
}

export function FeaturePreviewPanel({ feature, rows }: FeaturePreviewPanelProps) {
  if (!feature) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Select a feature to preview transformations.
      </div>
    );
  }

  const preview = buildFeaturePreview(feature, rows);

  if (!preview) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Preview unavailable for this feature.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">{feature.displayName}</p>
          <p className="text-xs text-muted-foreground">
            Sample transformation preview (first {preview.rows.length} rows)
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          {feature.method}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {preview.note && (
            <div className="rounded-md border border-muted-foreground/20 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {preview.note}
            </div>
          )}

          <div className="overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t">
                    {preview.columns.map((column) => (
                      <td key={column} className="px-3 py-2 whitespace-nowrap">
                        {String(row[column] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.summary && (
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(preview.summary).map(([column, stats]) => (
                <div key={column} className="rounded-md border px-3 py-2 text-xs">
                  <p className="font-medium">{column}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-muted-foreground">
                    <span>min {stats.min}</span>
                    <span>max {stats.max}</span>
                    <span>mean {stats.mean}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
