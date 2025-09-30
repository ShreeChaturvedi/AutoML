/**
 * FileCard - Display uploaded file information
 *
 * Shows:
 * - File icon based on type
 * - File name
 * - File type badge
 * - File size
 * - Click to preview
 * - Remove button
 */

import { useState } from 'react';
import { X, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UploadedFile } from '@/types/file';
import { getFileIcon, formatFileSize } from '@/types/file';
import { FilePreview } from './FilePreview';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileCardProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
}

export function FileCard({ file, onRemove }: FileCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const iconName = getFileIcon(file.type);
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    iconName
  ];

  const typeColorMap = {
    csv: 'bg-green-500/10 text-green-500 border-green-500/20',
    json: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    excel: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    pdf: 'bg-red-500/10 text-red-500 border-red-500/20',
    image: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  };

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border',
                typeColorMap[file.type]
              )}
            >
              {IconComponent && <IconComponent className="h-5 w-5" />}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {file.type.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="sr-only">Preview</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onRemove(file.id)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <FilePreview file={file} open={showPreview} onOpenChange={setShowPreview} />
    </>
  );
}