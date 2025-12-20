import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadDocument } from '@/lib/api/documents';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/types/file';
import { formatFileSize } from '@/types/file';

type ViewerStatus = 'loading' | 'ready' | 'error';

interface DocumentViewerProps {
  file: UploadedFile;
}

export function DocumentViewer({ file }: DocumentViewerProps) {
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');

  const documentId = file.metadata?.documentId;
  const mimeType = file.metadata?.mimeType ?? '';
  const isPdf = file.type === 'pdf' || mimeType.includes('pdf');
  const isText = file.type === 'markdown' || file.type === 'text';
  const isBinary = !isPdf && !isText;

  useEffect(() => {
    let isMounted = true;

    if (!documentId) {
      setStatus('error');
      setErrorMessage('Document metadata is missing. Re-upload the file to ingest it.');
      return undefined;
    }

    setStatus('loading');
    setErrorMessage(null);

    downloadDocument(documentId)
      .then(async (blob) => {
        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });

        if (isText) {
          const text = await blob.text();
          if (!isMounted) return;
          setTextContent(text);
        }

        setStatus('ready');
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load document.');
      });

    return () => {
      isMounted = false;
    };
  }, [documentId, isPdf, isText]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-md bg-muted p-1.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} · {file.type.toUpperCase()}
            </p>
          </div>
        </div>
        {documentId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => blobUrl && window.open(blobUrl, '_blank')}
            disabled={!blobUrl}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {status === 'loading' && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading document...
          </div>
        )}

        {status === 'error' && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
              <AlertTriangle className="mx-auto h-10 w-10 text-destructive/80" />
              <p className="text-sm font-medium">Unable to load document</p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        )}

        {status === 'ready' && isPdf && blobUrl && (
          <iframe
            src={blobUrl}
            title={file.name}
            className="h-full w-full bg-background"
          />
        )}

        {status === 'ready' && isText && (
          <ScrollArea className="h-full">
            <div
              className={cn(
                'p-6 text-sm leading-relaxed text-foreground',
                file.type === 'markdown' ? 'whitespace-pre-wrap' : 'whitespace-pre-wrap font-mono'
              )}
            >
              {textContent}
            </div>
          </ScrollArea>
        )}

        {status === 'ready' && isBinary && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Preview not available for this file type.</p>
              <p className="text-xs text-muted-foreground">
                Download the file to view it in your preferred application.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => blobUrl && window.open(blobUrl, '_blank')}
                disabled={!blobUrl}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download file
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
