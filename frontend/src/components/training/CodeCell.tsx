/**
 * CodeCell - Jupyter-style code cell with Monaco editor syntax highlighting
 */

import { useState, Suspense, lazy, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Code,
  MessageSquare
} from 'lucide-react';
import type { Cell } from '@/types/training';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import type { languages } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

// Lazy load Monaco Editor
const Editor = lazy(() =>
  import('@monaco-editor/react').then((module) => ({
    default: module.default
  }))
);

// Python keywords and builtins for autocomplete
const PYTHON_KEYWORDS = [
  // Keywords
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  // Common builtins
  'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set',
  'tuple', 'bool', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr',
  'open', 'input', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed',
  'enumerate', 'zip', 'map', 'filter', 'any', 'all', 'iter', 'next',
  // Common ML/Data Science
  'numpy', 'pandas', 'sklearn', 'matplotlib', 'plt', 'np', 'pd', 'tf',
  'torch', 'DataFrame', 'Series', 'array', 'fit', 'predict', 'transform',
  'train_test_split', 'accuracy_score', 'mean_squared_error', 'cross_val_score',
  'RandomForestClassifier', 'LogisticRegression', 'LinearRegression',
  'StandardScaler', 'MinMaxScaler', 'LabelEncoder', 'OneHotEncoder',
  'GridSearchCV', 'Pipeline', 'ColumnTransformer', 'SimpleImputer'
];

// Singleton for Python completion provider registration
let pythonCompletionRegistered = false;

interface CodeCellProps {
  cell: Cell;
  cellNumber: number;
  onRun?: () => void;
  onDelete?: () => void;
  onContentChange?: (content: string) => void;
  isRunning?: boolean;
}

export function CodeCell({ 
  cell, 
  cellNumber, 
  onRun, 
  onDelete, 
  onContentChange,
  isRunning 
}: CodeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(cell.content);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  
  // Theme for Monaco editor
  const { theme: appTheme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  
  // Resolve system theme preference
  useEffect(() => {
    if (appTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
      
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

  // Keep edit content in sync with cell content
  useEffect(() => {
    setEditContent(cell.content);
  }, [cell.content]);

  // Register Python completion provider once
  const registerPythonCompletions = (monaco: Monaco) => {
    if (pythonCompletionRegistered) return;
    
    monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const suggestions: languages.CompletionItem[] = PYTHON_KEYWORDS.map((keyword, index) => ({
          label: keyword,
          kind: keyword[0] === keyword[0].toUpperCase() 
            ? monaco.languages.CompletionItemKind.Class 
            : monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range,
          sortText: String(index).padStart(4, '0')
        }));
        
        return { suggestions };
      }
    });
    
    pythonCompletionRegistered = true;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cell.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onContentChange?.(editContent);
    setIsEditing(false);
  };

  const getStatusIcon = () => {
    switch (cell.status) {
      case 'running':
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  const isChat = cell.type === 'chat';

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      cell.status === 'running' && 'ring-2 ring-blue-500/50',
      cell.status === 'error' && 'border-red-300 dark:border-red-800'
    )}>
      {/* Cell header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs font-mono',
              isChat && 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
            )}
          >
            {isChat ? <MessageSquare className="h-3 w-3 mr-1" /> : <Code className="h-3 w-3 mr-1" />}
            {isChat ? 'Chat' : `In [${cellNumber}]`}
          </Badge>
          {getStatusIcon()}
          {cell.executionDurationMs && cell.status === 'success' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {cell.executionDurationMs}ms
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          {!isChat && onRun && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRun}
              disabled={isRunning}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Cell content */}
      <div className="relative">
        {(() => {
          // Calculate consistent height based on content (minimum 100px, ~19px per line)
          const lineCount = (cell.content || '# Click to edit...').split('\n').length;
          const calculatedHeight = Math.max(100, Math.min(400, (lineCount + 2) * 19));
          
          return isEditing ? (
            <div className="flex flex-col">
              <div className="border-b" style={{ height: `${calculatedHeight}px` }}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full bg-muted/30">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  <Editor
                    height="100%"
                    defaultLanguage={isChat ? 'plaintext' : 'python'}
                    value={editContent}
                    onChange={(value) => setEditContent(value || '')}
                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
                    onMount={(_editor, monaco) => {
                      if (!isChat) {
                        registerPythonCompletions(monaco);
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      wordWrap: 'on',
                      automaticLayout: true,
                      padding: { top: 8, bottom: 8 },
                      fixedOverflowWidgets: true,
                      quickSuggestions: true,
                      suggestOnTriggerCharacters: true,
                      suggest: {
                        showKeywords: true,
                        showSnippets: true,
                        showClasses: true,
                        showFunctions: true,
                        showVariables: true,
                        insertMode: 'replace',
                        filterGraceful: true
                      },
                      cursorBlinking: 'smooth',
                      folding: false
                    }}
                  />
                </Suspense>
              </div>
              <div className="flex justify-end gap-2 p-2 bg-muted/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditContent(cell.content);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={cn(
                'cursor-pointer hover:bg-muted/10 transition-colors',
                'border-l-2 border-transparent hover:border-primary/50'
              )}
              style={{ height: `${calculatedHeight}px` }}
              onClick={() => setIsEditing(true)}
            >
              <Suspense
                fallback={
                  <pre className="p-4 text-sm font-mono bg-slate-950 text-slate-50 dark:bg-slate-900 h-full">
                    <code>{cell.content || '# Click to edit...'}</code>
                  </pre>
                }
              >
                <Editor
                  height="100%"
                  defaultLanguage={isChat ? 'plaintext' : 'python'}
                  value={cell.content || '# Click to edit...'}
                  theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    wordWrap: 'on',
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 },
                    domReadOnly: true,
                    cursorStyle: 'line',
                    renderLineHighlight: 'none',
                    folding: false,
                    glyphMargin: false,
                    lineDecorationsWidth: 0,
                    overviewRulerBorder: false
                  }}
                />
              </Suspense>
            </div>
          );
        })()}
      </div>

      {/* Cell output */}
      {cell.output && (
        <div className="border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-center gap-2 py-1 h-7 rounded-none"
            onClick={() => setShowOutput(!showOutput)}
          >
            {showOutput ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide Output
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show Output
              </>
            )}
          </Button>
          
          {showOutput && (
            <div className={cn(
              'p-4 text-sm font-mono overflow-x-auto',
              cell.output.type === 'error' 
                ? 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-300'
                : 'bg-muted/30'
            )}>
              {cell.output.type === 'table' && cell.output.data ? (
                <div className="overflow-auto">
                  {/* Simple table rendering - would be enhanced with a proper table component */}
                  <pre>{JSON.stringify(cell.output.data, null, 2)}</pre>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{cell.output.content}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

