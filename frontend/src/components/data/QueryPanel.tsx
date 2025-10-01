/**
 * QueryPanel - Query input interface with dual-mode support
 *
 * Features:
 * - Mode toggle: English ↔ SQL (using ToggleGroup)
 * - Separate state for English and SQL inputs
 * - SQL syntax highlighting (Monaco Editor) with theme detection
 * - Default SQL template
 * - Execute button
 *
 * Design decisions documented in:
 * frontend/documentation/design/data-viewer-system.md
 */

import { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, MessageSquare, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import type { QueryMode } from '@/types/file';

// Lazy load Monaco Editor to reduce initial bundle size
const Editor = lazy(() =>
  import('@monaco-editor/react').then((module) => ({
    default: module.default
  }))
);

interface QueryPanelProps {
  onExecute: (query: string, mode: QueryMode) => void;
  isExecuting?: boolean;
  className?: string;
}

const DEFAULT_SQL = `-- Enter your SQL query
-- Example: SELECT * FROM data LIMIT 100

SELECT * FROM data LIMIT 100`;

const DEFAULT_ENGLISH = '';

export function QueryPanel({ onExecute, isExecuting = false, className }: QueryPanelProps) {
  const [mode, setMode] = useState<QueryMode>('sql');
  
  // Separate state for each mode (Issue #5)
  const [sqlQuery, setSqlQuery] = useState<string>(DEFAULT_SQL);
  const [englishQuery, setEnglishQuery] = useState<string>(DEFAULT_ENGLISH);
  
  // Get current theme for Monaco Editor (Issue #2)
  const { theme: appTheme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  
  // Resolve system theme preference
  useEffect(() => {
    if (appTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setResolvedTheme(appTheme as 'light' | 'dark');
    }
  }, [appTheme]);

  // Get current query based on mode
  const currentQuery = mode === 'sql' ? sqlQuery : englishQuery;

  // Handle mode toggle (Issue #3)
  const handleModeChange = useCallback((value: string) => {
    if (value === 'sql' || value === 'english') {
      setMode(value as QueryMode);
    }
  }, []);

  // Handle query text change
  const handleQueryChange = useCallback((value: string) => {
    if (mode === 'sql') {
      setSqlQuery(value);
    } else {
      setEnglishQuery(value);
    }
  }, [mode]);

  // Handle query execution
  const handleExecute = useCallback(() => {
    if (currentQuery.trim()) {
      onExecute(currentQuery, mode);
    }
  }, [currentQuery, mode, onExecute]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + Enter to execute
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute]
  );

  return (
    <div className={cn('flex flex-col h-full bg-card border-l', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Query Builder</h3>
        </div>

        {/* Mode Toggle - Better UI (Issue #3) */}
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={handleModeChange}
          className="w-full bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem
            value="english"
            aria-label="Natural language mode"
            className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="ml-2">English</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="sql"
            aria-label="SQL mode"
            className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm font-mono"
          >
            <Code2 className="h-4 w-4" />
            <span className="ml-2">SQL</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Mode description */}
        <p className="text-xs text-muted-foreground">
          {mode === 'sql'
            ? 'Write SQL queries to explore your data. Press Cmd/Ctrl+Enter to execute.'
            : 'Describe what you want to see in plain English. Our AI will generate the SQL query.'}
        </p>
      </div>

      {/* Query Input */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        {mode === 'sql' ? (
          // SQL Mode: Monaco Editor with syntax highlighting (Issue #1 & #2)
          <div className="flex-1 border rounded-md overflow-hidden bg-background">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <Editor
                height="100%"
                defaultLanguage="sql"
                value={sqlQuery}
                onChange={(value) => handleQueryChange(value || '')}
                onMount={(editor) => {
                  // Focus editor on mount
                  editor.focus();
                  // Set up keyboard shortcuts
                  editor.addCommand(
                    // Cmd/Ctrl + Enter
                    (window.navigator.platform.toLowerCase().includes('mac') ? 2048 : 2176) | 3,
                    handleExecute
                  );
                }}
                // Dynamic theme based on app theme (Issue #2)
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: isExecuting,
                  fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  suggest: {
                    showKeywords: true,
                    showSnippets: true
                  }
                }}
              />
            </Suspense>
          </div>
        ) : (
          // English Mode: Simple textarea
          <Textarea
            value={englishQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to see in plain English... For example: Show me all rows where revenue is greater than 1000"
            disabled={isExecuting}
            className="flex-1 resize-none leading-relaxed focus-visible:ring-1"
            aria-label="Natural language query input"
          />
        )}
      </div>

      {/* Execute Button */}
      <div className="p-4 border-t">
        <Button
          onClick={handleExecute}
          disabled={isExecuting || !currentQuery.trim()}
          className="w-full"
          size="lg"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Execute Query
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Cmd/Ctrl + Enter
        </p>
      </div>
    </div>
  );
}
