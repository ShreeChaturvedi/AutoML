/**
 * FilePreview - Modal for previewing uploaded files
 *
 * Supports:
 * - PDF preview (using iframe)
 * - Image preview (full-size with zoom)
 * - CSV preview (first few rows in table)
 * - JSON preview (formatted JSON)
 *
 * TODO: Add more advanced preview features (PDF.js for better PDF rendering, etc.)
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { UploadedFile } from '@/types/file';
import { formatFileSize } from '@/types/file';
import Papa from 'papaparse';
import { Badge } from '@/components/ui/badge';
import { getDatasetSample } from '@/lib/api/datasets';

interface FilePreviewProps {
  file: UploadedFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreview({ file, open, onOpenChange }: FilePreviewProps) {
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    // For hydrated files from backend (no file object), fetch sample from API
    if (!file.file && file.metadata?.datasetId && (file.type === 'csv' || file.type === 'json' || file.type === 'excel')) {
      setIsLoading(true);
      void getDatasetSample(file.metadata.datasetId)
        .then((data) => {
          setPreviewContent(
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Showing sample from persisted dataset ({data.rowCount.toLocaleString()} total rows)
              </p>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {data.columns.map((header, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sample.map((row, i) => (
                      <tr key={i} className="border-t">
                        {data.columns.map((header, j) => (
                          <td key={j} className="px-3 py-2 font-mono text-xs">
                            {String(row[header] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch dataset sample:', error);
          setPreviewContent(
            <div className="p-6 text-center space-y-2">
              <p className="text-sm text-destructive">Failed to load dataset preview</p>
              <p className="text-xs text-muted-foreground">
                Use the Data Viewer tab to explore this dataset.
              </p>
            </div>
          );
          setIsLoading(false);
        });
      return;
    }

    // For non-tabular hydrated files, show message
    if (!file.file) {
      setPreviewContent(
        <div className="p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Preview not available for this file type.
          </p>
        </div>
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Generate preview based on file type
    switch (file.type) {
      case 'pdf': {
        const pdfUrl = URL.createObjectURL(file.file);
        setPreviewContent(
          <iframe
            src={pdfUrl}
            className="w-full h-[600px] rounded-lg border"
            title={file.name}
            onLoad={() => setIsLoading(false)}
          />
        );
        break;
      }

      case 'csv':
        Papa.parse(file.file, {
          header: true,
          preview: 10, // Only show first 10 rows
          complete: (results) => {
            const headers = results.meta.fields || [];
            const rows = results.data as Record<string, unknown>[];

            setPreviewContent(
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Showing first 10 rows</p>
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {headers.map((header, i) => (
                          <th key={i} className="px-4 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {headers.map((header, j) => (
                            <td key={j} className="px-4 py-2">
                              {String(row[header] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
            setIsLoading(false);
          },
          error: () => {
            setPreviewContent(
              <p className="text-sm text-destructive">Error loading CSV preview</p>
            );
            setIsLoading(false);
          }
        });
        break;

      case 'json':
        file.file.text().then((text) => {
          try {
            const json = JSON.parse(text);
            setPreviewContent(
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                {JSON.stringify(json, null, 2)}
              </pre>
            );
          } catch {
            setPreviewContent(
              <p className="text-sm text-destructive">Error parsing JSON</p>
            );
          }
          setIsLoading(false);
        });
        break;

      default:
        setPreviewContent(
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              Preview not available for this file type
            </p>
          </div>
        );
        setIsLoading(false);
    }

    // Cleanup
    return () => {
      setPreviewContent(null);
    };
  }, [file, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline">{file.type.toUpperCase()}</Badge>
            <span>{formatFileSize(file.size)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="pr-4">{previewContent}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
