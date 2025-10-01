/**
 * DataViewerTab - Tableau-style data exploration interface
 *
 * Now includes FileTabBar for switching between file previews and query results
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';
import { QueryPanel } from './QueryPanel';
import { FileTabBar } from './FileTabBar';
import { DataTable } from './DataTable';
import { useDataStore } from '@/stores/dataStore';
import { useProjectStore } from '@/stores/projectStore';
import { getDuckDB } from '@/lib/duckdb';
import type { QueryMode, DataPreview } from '@/types/file';

export function DataViewerTab() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const { projectId } = useParams();
  const projects = useProjectStore((state) => state.projects);
  const activeProject = projects.find((p) => p.id === projectId);

  const previews = useDataStore((state) => state.previews);
  const files = useDataStore((state) => state.files);
  const queryArtifacts = useDataStore((state) => state.queryArtifacts);
  const createArtifact = useDataStore((state) => state.createArtifact);
  const activeFileTabId = useDataStore((state) => state.activeFileTabId);
  const fileTabType = useDataStore((state) => state.fileTabType);
  const setActiveFileTab = useDataStore((state) => state.setActiveFileTab);

  // Auto-select first tab if none selected
  useEffect(() => {
    if (!activeFileTabId && previews.length > 0) {
      const firstFile = files.find((f) => previews.some((p) => p.fileId === f.id));
      if (firstFile) {
        setActiveFileTab(firstFile.id, 'file');
      }
    }
  }, [activeFileTabId, previews, files, setActiveFileTab]);

  // Handle query execution
  const handleExecuteQuery = useCallback(
    async (query: string, mode: QueryMode) => {
      if (!activeProject || previews.length === 0) return;

      setIsExecuting(true);
      setQueryError(null);

      try {
        const duckdb = getDuckDB();

        // For English mode, we would translate to SQL here (future enhancement)
        // For now, treat it as SQL directly
        const sqlQuery = query;

        // Execute query using DuckDB
        const result = await duckdb.executeQuery(sqlQuery);

        // Convert QueryResult to DataPreview format
        const dataPreview: DataPreview = {
          fileId: 'query-result',
          headers: result.columns.map(col => col.name),
          rows: result.rows,
          totalRows: result.totalRows,
          previewRows: result.rowCount,
          // Optionally add statistics in future
        };

        // Create artifact with result
        const artifactId = createArtifact(query, mode, dataPreview, activeProject.id);

        // Switch to the new artifact tab
        setActiveFileTab(artifactId, 'artifact');
      } catch (error) {
        console.error('Query execution failed:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error occurred';
        setQueryError(errorMessage);
      } finally {
        setIsExecuting(false);
      }
    },
    [activeProject, previews, createArtifact, setActiveFileTab]
  );

  if (previews.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">No data loaded</h3>
            <p className="text-sm text-muted-foreground">
              Upload a dataset from the Upload phase to start exploring your data with queries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get active tab content
  const getActiveTabContent = () => {
    if (!activeFileTabId) return null;

    if (fileTabType === 'file') {
      const preview = previews.find((p) => p.fileId === activeFileTabId);
      if (preview) {
        return <DataTable preview={preview} />;
      }
    } else if (fileTabType === 'artifact') {
      const artifact = queryArtifacts.find((a) => a.id === activeFileTabId);
      if (artifact) {
        return (
          <DataTable
            preview={artifact.result}
            queryInfo={{
              query: artifact.query,
              mode: artifact.mode,
              timestamp: artifact.timestamp
            }}
          />
        );
      }
    }

    return null;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* File Tab Bar */}
      {projectId && <FileTabBar projectId={projectId} />}

      {/* Error Banner */}
      {queryError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Query Error</p>
            <p className="text-sm text-destructive/90 mt-1 whitespace-pre-wrap">{queryError}</p>
          </div>
          <button
            onClick={() => setQueryError(null)}
            className="text-destructive/70 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Data Display (left side) */}
        <div className="flex-1 min-w-0 overflow-auto">
          {getActiveTabContent()}
        </div>

        {/* Query Panel (right side) */}
        <QueryPanel
          onExecute={handleExecuteQuery}
          isExecuting={isExecuting}
          className="w-[350px] shrink-0"
        />
      </div>
    </div>
  );
}
