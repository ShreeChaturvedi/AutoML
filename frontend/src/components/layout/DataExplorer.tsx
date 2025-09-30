/**
 * DataExplorer - Right panel for data preview and statistics
 *
 * Displays:
 * - Data preview table (first n rows)
 * - Dataset statistics (rows, size, columns)
 * - Column information and statistics
 *
 * Visibility managed by parent (AppShell)
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore } from '@/stores/dataStore';
import { DataTable } from '@/components/data/DataTable';
import { DataStats } from '@/components/data/DataStats';
import { Database, FileText } from 'lucide-react';

interface DataExplorerProps {
  collapsed: boolean;
}

export function DataExplorer({ collapsed }: DataExplorerProps) {
  const currentPreview = useDataStore((state) => state.currentPreview);
  const isProcessing = useDataStore((state) => state.isProcessing);

  if (collapsed) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Data Explorer</span>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Processing data...</p>
              </div>
            </div>
          ) : currentPreview ? (
            <>
              {/* Data Statistics */}
              <DataStats preview={currentPreview} />

              <Separator />

              {/* Data Preview Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Preview</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Showing {currentPreview.previewRows} of {currentPreview.totalRows} rows
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable preview={currentPreview} />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-sm font-medium text-foreground mb-1">No data loaded</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Upload a dataset to see preview and statistics here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}