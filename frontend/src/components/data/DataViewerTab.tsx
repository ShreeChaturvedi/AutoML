/**
 * DataViewerTab - Data viewer tab content
 *
 * Displays:
 * - Data preview table with footer showing row/column count
 * - Empty state when no data is loaded
 *
 * This replaces the DataExplorer panel and shows data in the main content area.
 */

import { Card, CardContent } from '@/components/ui/card';
import { useDataStore } from '@/stores/dataStore';
import { DataTable } from '@/components/data/DataTable';
import { FileText } from 'lucide-react';

export function DataViewerTab() {
  const currentPreview = useDataStore((state) => state.currentPreview);
  const isProcessing = useDataStore((state) => state.isProcessing);

  if (isProcessing) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Processing data...</p>
        </div>
      </div>
    );
  }

  if (!currentPreview) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">No data loaded</h3>
            <p className="text-sm text-muted-foreground">
              Upload a dataset from the Upload tab to view and explore your data here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-4">
      {/* Data Preview Table */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          <DataTable preview={currentPreview} />
        </CardContent>
      </Card>
    </div>
  );
}