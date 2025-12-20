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

// Colors for file type icons when selected (using existing Tailwind colors)
const activeIconColorByType: Record<UploadedFileType, string> = {
  csv: 'text-green-500',
  json: 'text-blue-500',
  excel: 'text-emerald-500',
  pdf: 'text-red-500',
  markdown: 'text-purple-500',
  word: 'text-blue-500',
  text: 'text-muted-foreground',
  other: 'text-muted-foreground'
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
      <div className="px-3 py-2 text-workflow text-muted-foreground">
        Upload files to populate explorer.
      </div>
    );
  }

  const renderFileList = (list: typeof projectFiles) => (
    <div className="space-y-0.5">
      {list.map((file) => {
        const Icon = iconByType[file.type] ?? File;
        const isActive = file.id === activeFileTabId;
        const iconColor = isActive
          ? activeIconColorByType[file.type] ?? 'text-muted-foreground'
          : 'text-muted-foreground';

        return (
          <button
            key={file.id}
            onClick={() => handleOpenFile(file.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
              isActive
                ? 'bg-muted text-foreground font-medium'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
            <span className="text-workflow truncate">{file.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="px-2 py-1">
          <h2 className="text-workflow-label font-semibold text-muted-foreground uppercase tracking-wider">
            Data Files
          </h2>
        </div>
        {dataFiles.length > 0 ? (
          renderFileList(dataFiles)
        ) : (
          <div className="px-3 py-2 text-workflow text-muted-foreground">
            No datasets yet.
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="px-2 py-1">
          <h2 className="text-workflow-label font-semibold text-muted-foreground uppercase tracking-wider">
            Context Files
          </h2>
        </div>
        {contextFiles.length > 0 ? (
          renderFileList(contextFiles)
        ) : (
          <div className="px-3 py-2 text-workflow text-muted-foreground">
            No context docs yet.
          </div>
        )}
      </div>
    </div>
  );
}
