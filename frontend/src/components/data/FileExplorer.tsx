import { useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, FileText, FileSpreadsheet, FileType, File } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { cn } from '@/lib/utils';
import type { FileType as UploadedFileType } from '@/types/file';

interface FileExplorerProps {
  projectId: string;
}

const iconByType: Record<UploadedFileType, ComponentType<{ className?: string }>> = {
  csv: FileSpreadsheet,
  json: FileSpreadsheet,
  excel: FileSpreadsheet,
  pdf: FileText,
  markdown: FileCode,
  word: FileType,
  text: FileText,
  other: File
};

export function FileExplorer({ projectId }: FileExplorerProps) {
  const navigate = useNavigate();
  const files = useDataStore((state) => state.files);
  const activeFileTabId = useDataStore((state) => state.activeFileTabId);
  const openFileTab = useDataStore((state) => state.openFileTab);
  const hydrateFromBackend = useDataStore((state) => state.hydrateFromBackend);

  useEffect(() => {
    if (projectId) {
      void hydrateFromBackend(projectId);
    }
  }, [projectId, hydrateFromBackend]);

  const projectFiles = useMemo(
    () => files.filter((file) => file.projectId === projectId),
    [files, projectId]
  );

  const dataFiles = useMemo(
    () => projectFiles.filter((file) => ['csv', 'json', 'excel'].includes(file.type)),
    [projectFiles]
  );

  const contextFiles = useMemo(
    () => projectFiles.filter((file) => !['csv', 'json', 'excel'].includes(file.type)),
    [projectFiles]
  );

  const handleOpenFile = (fileId: string) => {
    openFileTab(fileId);
    navigate(`/project/${projectId}/data-viewer`);
  };

  if (projectFiles.length === 0) {
    return (
      <div className="px-2 py-3 text-xs text-muted-foreground">
        Upload data or context files to populate your explorer.
      </div>
    );
  }

  const renderFileList = (list: typeof projectFiles) => (
    <div className="space-y-0.5">
      {list.map((file) => {
        const Icon = iconByType[file.type] ?? File;
        const isActive = file.id === activeFileTabId;

        return (
          <button
            key={file.id}
            onClick={() => handleOpenFile(file.id)}
            className={cn(
              'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-workflow',
              isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Data Files
        </div>
        {dataFiles.length > 0 ? (
          renderFileList(dataFiles)
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No datasets yet.
          </div>
        )}
      </div>

      <div>
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Context Files
        </div>
        {contextFiles.length > 0 ? (
          renderFileList(contextFiles)
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No context docs yet.
          </div>
        )}
      </div>
    </div>
  );
}
