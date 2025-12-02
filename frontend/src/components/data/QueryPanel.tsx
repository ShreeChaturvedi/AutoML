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

import { useState, useCallback, Suspense, lazy, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, MessageSquare, Code2, PanelRightClose, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import type { QueryMode } from '@/types/file';

// Lazy load Monaco Editor to reduce initial bundle size
const Editor = lazy(() =>
  import('@monaco-editor/react').then((module) => ({
    default: module.default
  }))
);

// Import monaco types for completion registration
import type { IDisposable, languages } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

// SQL keywords for autocomplete
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN',
  'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'AS', 'DISTINCT', 'COUNT',
  'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'NULL',
  'IS NULL', 'IS NOT NULL', 'ASC', 'DESC', 'UNION', 'UNION ALL', 'EXCEPT',
  'INTERSECT', 'EXISTS', 'ALL', 'ANY', 'WITH', 'OVER', 'PARTITION BY',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'COALESCE', 'NULLIF', 'CAST', 'CONVERT'
];

interface QueryPanelProps {
  onExecute: (query: string, mode: QueryMode) => void;
  isExecuting?: boolean;
  className?: string;
  /** Table names available for autocomplete suggestions */
  tableNames?: string[];
  /** Column names for autocomplete, keyed by table name */
  columnsByTable?: Record<string, string[]>;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
}

const DEFAULT_SQL = `-- Enter your SQL query
-- Use the table name from your uploaded dataset
-- Press Ctrl+Space for autocomplete suggestions

SELECT * FROM your_table LIMIT 100`;

const DEFAULT_ENGLISH = '';

export function QueryPanel({ 
  onExecute, 
  isExecuting = false, 
  className, 
  tableNames = [],
  columnsByTable = {},
  collapsed = false,
  onCollapsedChange
}: QueryPanelProps) {
  const [mode, setMode] = useState<QueryMode>('sql');
  
  // Separate state for each mode (Issue #5)
  const [sqlQuery, setSqlQuery] = useState<string>(DEFAULT_SQL);
  const [englishQuery, setEnglishQuery] = useState<string>(DEFAULT_ENGLISH);
  
  // Get current theme for Monaco Editor (Issue #2)
  const { theme: appTheme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  
  // Store completion provider disposable for cleanup
  const completionProviderRef = useRef<IDisposable | null>(null);
  
  // Cleanup completion provider on unmount
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

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

  // Collapsed state - just show a thin bar with expand button
  if (collapsed) {
    return (
      <div className={cn(
        'flex flex-col h-full bg-card border-l items-center py-4 transition-all duration-300 ease-in-out',
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange?.(false)}
          className="mb-2"
          title="Expand Query Panel"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180">
            Query Builder
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-card border-l transition-all duration-300 ease-in-out', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Query Builder</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange?.(true)}
            className="h-8 w-8"
            title="Collapse Query Panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
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
                onMount={(editorInstance, monaco: Monaco) => {
                  // Focus editor on mount
                  editorInstance.focus();
                  // Set up keyboard shortcuts
                  editorInstance.addCommand(
                    // Cmd/Ctrl + Enter
                    (window.navigator.platform.toLowerCase().includes('mac') ? 2048 : 2176) | 3,
                    handleExecute
                  );
                  
                  // Clean up previous completion provider if it exists
                  if (completionProviderRef.current) {
                    completionProviderRef.current.dispose();
                  }
                  
                  // Register custom SQL completion provider for keywords, tables, and columns
                  completionProviderRef.current = monaco.languages.registerCompletionItemProvider('sql', {
                    triggerCharacters: [' ', '.', ','],
                    provideCompletionItems: (model, position) => {
                      const word = model.getWordUntilPosition(position);
                      const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn
                      };
                      
                      const suggestions: languages.CompletionItem[] = [];
                      
                      // Add SQL keywords with high priority
                      SQL_KEYWORDS.forEach((keyword) => {
                        suggestions.push({
                          label: keyword,
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: keyword,
                          range,
                          detail: 'SQL Keyword',
                          sortText: '0' + keyword // Sort keywords first
                        });
                      });
                      
                      // Add table name suggestions
                      tableNames.forEach((tableName) => {
                        suggestions.push({
                          label: tableName,
                          kind: monaco.languages.CompletionItemKind.Class,
                          insertText: tableName,
                          range,
                          detail: 'Table',
                          documentation: `Database table: ${tableName}`,
                          sortText: '1' + tableName
                        });
                      });
                      
                      // Add column suggestions for each table
                      Object.entries(columnsByTable).forEach(([tableName, columns]) => {
                        columns.forEach((col) => {
                          suggestions.push({
                            label: col,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col,
                            range,
                            detail: `Column in ${tableName}`,
                            documentation: `Column from table ${tableName}`,
                            sortText: '2' + col
                          });
                        });
                      });
                      
                      return { suggestions };
                    }
                  });
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
                  // Fix: Ensure autocomplete widgets render correctly in transformed containers
                  fixedOverflowWidgets: true,
                  suggest: {
                    showKeywords: true,
                    showSnippets: true,
                    // Improve autocomplete behavior
                    insertMode: 'replace',
                    filterGraceful: true,
                    localityBonus: true
                  },
                  // Better cursor and selection visibility
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on'
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
