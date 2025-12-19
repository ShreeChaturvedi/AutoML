/**
 * TrainingPanel - Jupyter-style training interface with AI assistance
 *
 * Features:
 * - Model selection with template code
 * - Code cells with real execution (Pyodide/Docker)
 * - Runtime toggle (Browser/Cloud)
 * - Package management
 * - Chat input for AI assistance (RAG-enabled)
 * - Rich output visualization
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Plus,
  Sparkles,
  Code,
  Loader2,
  BookOpen,
  Lightbulb,
  Database,
  Wand2,
  Paperclip,
  Brain,
  ArrowUp
} from 'lucide-react';
import { CodeCell } from './CodeCell';
import { ModelSelector } from './ModelSelector';
import { RuntimeToggle } from './RuntimeToggle';
import { RuntimeManagerDialog } from './RuntimeManagerDialog';
import type { Cell, ModelTemplate } from '@/types/training';
import { getAnswer, uploadDocument } from '@/lib/api/documents';
import { downloadDataset } from '@/lib/api/datasets';
import { cn } from '@/lib/utils';
import { useExecutionStore } from '@/stores/executionStore';
import { useDataStore } from '@/stores/dataStore';
import { useFeatureStore } from '@/stores/featureStore';
import { generateFeatureEngineeringCode } from '@/lib/features/codeGenerator';
import { getFileType, type UploadedFile } from '@/types/file';

const ASSISTANT_MODELS = [
  { value: 'auto', label: 'Auto (RAG)' },
  { value: 'llama-3.1-8b', label: 'Llama 3.1 8B' },
  { value: 'phi-3-mini', label: 'Phi-3 Mini' }
];

const REASONING_MODES = [
  { value: 'fast', label: 'Fast' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'deep', label: 'Deep' }
];

export function TrainingPanel() {
  const { projectId } = useParams<{ projectId: string }>();

  const [selectedModel, setSelectedModel] = useState<ModelTemplate | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODELS[0].value);
  const [assistantReasoning, setAssistantReasoning] = useState(REASONING_MODES[1].value);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [mountedDatasets, setMountedDatasets] = useState<Set<string>>(new Set());
  const [mountingDatasets, setMountingDatasets] = useState(false);
  const [attachmentStatus, setAttachmentStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle');
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Execution store
  const {
    mode: executionMode,
    setMode: setExecutionMode,
    pyodideReady,
    pyodideInitializing,
    pyodideProgress,
    cloudAvailable,
    cloudInitializing,
    sessionId,
    isExecuting,
    initializePyodide,
    initializeCloud,
    checkCloudHealth,
    executeCode: executeWithStore,
    mountDatasetFile
  } = useExecutionStore();

  // Get dataset files for autocomplete
  const files = useDataStore((s) => s.files);
  const addFile = useDataStore((s) => s.addFile);
  const setFileMetadata = useDataStore((s) => s.setFileMetadata);
  const projectFiles = useMemo(() =>
    projectId ? files.filter(f => f.projectId === projectId) : [],
    [files, projectId]
  );
  const datasetFiles = useMemo(
    () => projectFiles.filter((file) => file.metadata?.datasetId),
    [projectFiles]
  );
  const datasetCompletionFiles = useMemo(
    () => datasetFiles.map((file) => ({
      name: file.name,
      datasetId: file.metadata?.datasetId
    })),
    [datasetFiles]
  );
  const documentFiles = useMemo(
    () => projectFiles.filter((file) => file.metadata?.documentId),
    [projectFiles]
  );

  // Get feature specs for this project
  const features = useFeatureStore((s) => s.features);
  const hydrateFeatures = useFeatureStore((s) => s.hydrateFromProject);
  const projectFeatures = useMemo(() =>
    projectId ? features.filter(f => f.projectId === projectId && f.enabled) : [],
    [features, projectId]
  );

  useEffect(() => {
    if (!projectId) return;
    hydrateFeatures(projectId);
  }, [projectId, hydrateFeatures]);

  // Initialize Pyodide on mount if in browser mode
  useEffect(() => {
    if (executionMode === 'browser' && !pyodideReady && !pyodideInitializing) {
      initializePyodide().catch(console.error);
    }
  }, [executionMode, pyodideReady, pyodideInitializing, initializePyodide]);

  useEffect(() => {
    checkCloudHealth().catch(() => undefined);
  }, [checkCloudHealth]);

  useEffect(() => {
    if (
      executionMode === 'cloud' &&
      projectId &&
      cloudAvailable &&
      !sessionId &&
      !cloudInitializing
    ) {
      initializeCloud(projectId).catch(console.error);
    }
  }, [executionMode, projectId, cloudAvailable, sessionId, cloudInitializing, initializeCloud]);

  // Mount datasets to Pyodide filesystem when ready
  useEffect(() => {
    if (!pyodideReady || executionMode !== 'browser' || mountingDatasets) {
      return;
    }

    // Find datasets that haven't been mounted yet
    const unmountedDatasets = datasetFiles.filter(f =>
      f.metadata?.datasetId && !mountedDatasets.has(f.metadata.datasetId)
    );

    if (unmountedDatasets.length === 0) {
      return;
    }

    setMountingDatasets(true);

    const mountAll = async () => {
      const newMounted = new Set(mountedDatasets);

      for (const file of unmountedDatasets) {
        const datasetId = file.metadata?.datasetId;
        if (!datasetId) continue;

        try {
          console.log(`[TrainingPanel] Mounting dataset: ${file.name}`);
          const content = await downloadDataset(datasetId);
          await mountDatasetFile(file.name, content, datasetId);
          newMounted.add(datasetId);
          console.log(`[TrainingPanel] Mounted: ${file.name}`);
        } catch (error) {
          console.error(`[TrainingPanel] Failed to mount ${file.name}:`, error);
        }
      }

      setMountedDatasets(newMounted);
      setMountingDatasets(false);
    };

    mountAll().catch(console.error);
  }, [pyodideReady, executionMode, datasetFiles, mountedDatasets, mountDatasetFile, mountingDatasets]);

  // Scroll to bottom when cells change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [cells]);

  // Auto-resize chat composer
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(220, Math.max(80, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
  }, [chatInput]);

  useEffect(() => {
    if (!attachmentMessage) return;
    const timeout = setTimeout(() => {
      setAttachmentMessage(null);
      setAttachmentStatus('idle');
    }, 4000);
    return () => clearTimeout(timeout);
  }, [attachmentMessage]);

  // Generate unique ID for cells
  const generateCellId = () => `cell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Add a new code cell
  const addCodeCell = useCallback((content: string = '') => {
    const newCell: Cell = {
      id: generateCellId(),
      type: 'code',
      content,
      status: 'idle',
      createdAt: new Date().toISOString()
    };
    setCells(prev => [...prev, newCell]);
  }, []);

  // Generate feature engineering code and add as a cell
  const handleGenerateFeatureCode = useCallback(() => {
    if (projectFeatures.length === 0 || datasetFiles.length === 0) return;

    // Use the first dataset file
    const datasetFile = datasetFiles[0];
    const code = generateFeatureEngineeringCode(projectFeatures, datasetFile.name, {
      datasetId: datasetFile.metadata?.datasetId
    });
    addCodeCell(code);
  }, [projectFeatures, datasetFiles, addCodeCell]);

  // Add a chat cell (AI response)
  const addChatCell = useCallback((content: string) => {
    const newCell: Cell = {
      id: generateCellId(),
      type: 'chat',
      content,
      status: 'success',
      createdAt: new Date().toISOString()
    };
    setCells(prev => [...prev, newCell]);
  }, []);

  // Handle model selection
  const handleSelectModel = useCallback((model: ModelTemplate) => {
    setSelectedModel(model);
    setShowModelSelector(false);

    // Generate code from template
    let code = model.codeTemplate;

    // Replace template placeholders with default values
    for (const [key, config] of Object.entries(model.defaultParams)) {
      code = code.replace(new RegExp(`{{${key}}}`, 'g'), String(config.default));
    }

    // Add the generated code as a new cell
    addCodeCell(code);
  }, [addCodeCell]);

  // Handle cell content change
  const handleCellContentChange = useCallback((cellId: string, content: string) => {
    setCells(prev => prev.map(cell =>
      cell.id === cellId ? { ...cell, content } : cell
    ));
  }, []);

  // Handle cell deletion
  const handleDeleteCell = useCallback((cellId: string) => {
    setCells(prev => prev.filter(cell => cell.id !== cellId));
  }, []);

  // Execute a cell with real Python runtime
  const handleRunCell = useCallback(async (cellId: string) => {
    if (!projectId) return;

    const cell = cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') return;

    // Update cell status to running
    setCells(prev => prev.map(c =>
      c.id === cellId
        ? { ...c, status: 'running' as const, executedAt: new Date().toISOString() }
        : c
    ));

    try {
      const result = await executeWithStore(cell.content, projectId);

      // Update cell with result
      setCells(prev => prev.map(c => {
        if (c.id !== cellId) return c;

        return {
          ...c,
          status: result.status === 'success' ? 'success' as const : 'error' as const,
          executionDurationMs: result.executionMs,
          output: {
            type: result.status === 'error' ? 'error' as const : 'text' as const,
            content: result.stdout || result.stderr || '',
            data: result.outputs
          }
        };
      }));
    } catch (error) {
      console.error('Execution error:', error);
      setCells(prev => prev.map(c =>
        c.id === cellId
          ? {
              ...c,
              status: 'error' as const,
              output: {
                type: 'error' as const,
                content: error instanceof Error ? error.message : 'Execution failed'
              }
            }
          : c
      ));
    }
  }, [cells, projectId, executeWithStore]);

  const handleAttachFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;

    const uploadedFile: UploadedFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: getFileType(file),
      size: file.size,
      uploadedAt: new Date(),
      projectId,
      file
    };

    addFile(uploadedFile);
    setAttachmentStatus('uploading');
    setAttachmentMessage(null);

    try {
      const response = await uploadDocument(projectId, file);
      const document = response.document;

      setFileMetadata(uploadedFile.id, {
        documentId: document.documentId,
        chunkCount: document.chunkCount,
        embeddingDimension: document.embeddingDimension
      });

      setAttachmentStatus('success');
      setAttachmentMessage(`Added ${file.name} to context`);
    } catch (error) {
      setAttachmentStatus('error');
      setAttachmentMessage(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      event.target.value = '';
    }
  }, [projectId, addFile, setFileMetadata]);

  // Handle AI chat submission
  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || !projectId || isAiThinking) return;

    const userMessage = chatInput;
    const modelLabel = ASSISTANT_MODELS.find((model) => model.value === assistantModel)?.label ?? assistantModel;
    const reasoningLabel = REASONING_MODES.find((mode) => mode.value === assistantReasoning)?.label ?? assistantReasoning;
    setChatInput('');
    setIsAiThinking(true);

    // Add user message as a cell
    const userCell: Cell = {
      id: generateCellId(),
      type: 'chat',
      content: `**You:**\nModel: ${modelLabel} · Reasoning: ${reasoningLabel}\n${userMessage}`,
      status: 'success',
      createdAt: new Date().toISOString()
    };
    setCells(prev => [...prev, userCell]);

    try {
      // Call the RAG API
      const response = await getAnswer(projectId, userMessage);

      if (response.answer.status === 'ok') {
        const aiResponse = response.answer.answer;
        const citations = response.answer.citations;

        // Format response with citations
        let formattedResponse = `**AI Assistant:**\n\n${aiResponse}`;

        if (citations.length > 0) {
          formattedResponse += '\n\n---\n*Sources:*\n';
          citations.forEach((citation, idx) => {
            formattedResponse += `\n${idx + 1}. ${citation.filename} (span ${citation.span.start}-${citation.span.end})`;
          });
        }

        addChatCell(formattedResponse);
      } else {
        addChatCell('**AI Assistant:**\n\nI couldn\'t find relevant information in your documents. Try uploading relevant documentation or rephrasing your question.');
      }
    } catch (error) {
      console.error('AI chat failed:', error);
      addChatCell('**AI Assistant:**\n\nSorry, I encountered an error. Please try again.');
    } finally {
      setIsAiThinking(false);
      textareaRef.current?.focus();
    }
  }, [chatInput, projectId, assistantModel, assistantReasoning, addChatCell, isAiThinking]);

  const handleChatKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleChatSubmit();
    }
  }, [handleChatSubmit]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Compact toolbar - no giant header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <RuntimeToggle
            mode={executionMode}
            onModeChange={setExecutionMode}
            pyodideReady={pyodideReady}
            pyodideProgress={pyodideProgress}
            pyodideInitializing={pyodideInitializing}
            cloudAvailable={cloudAvailable}
            cloudInitializing={cloudInitializing}
            isExecuting={isExecuting}
          />
          {projectId && <RuntimeManagerDialog projectId={projectId} />}
          {selectedModel && (
            <Badge variant="outline" className="text-xs gap-1">
              <Code className="h-3 w-3" />
              {selectedModel.name}
            </Badge>
          )}
          {/* Dataset mount status */}
          {executionMode === 'browser' && pyodideReady && mountedDatasets.size > 0 && (
            <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-500/40">
              <Database className="h-3 w-3" />
              {mountedDatasets.size} dataset{mountedDatasets.size !== 1 ? 's' : ''} mounted
            </Badge>
          )}
          {mountingDatasets && (
            <Badge variant="outline" className="text-xs gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Mounting datasets...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Generate Features button - only show if features exist */}
          {projectFeatures.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-purple-500/10 hover:text-purple-500 transition-transform hover:scale-110"
                    onClick={handleGenerateFeatureCode}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Generate feature code ({projectFeatures.length} features)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Add Cell - compact + button with hover animation */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-primary/10 hover:text-primary transition-transform hover:scale-110"
            onClick={() => addCodeCell()}
            title="Add code cell"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {/* Model Selector */}
              {showModelSelector && (
                <div className="mb-6">
                  <ModelSelector
                    selectedModelId={selectedModel?.id}
                    onSelectModel={handleSelectModel}
                  />
                </div>
              )}

              {/* Cells */}
              {cells.length === 0 && !showModelSelector ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Ready to Train</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      Select a model above or add a code cell to start training.
                      Ask the AI assistant for help with your training code.
                    </p>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowModelSelector(true)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Choose Model
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addCodeCell()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Cell
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {cells.map((cell, index) => (
                    <CodeCell
                      key={cell.id}
                      cell={cell}
                      cellNumber={index + 1}
                      onRun={cell.type === 'code' ? () => handleRunCell(cell.id) : undefined}
                      onDelete={() => handleDeleteCell(cell.id)}
                      onContentChange={cell.type === 'code' ? (content) => handleCellContentChange(cell.id, content) : undefined}
                      isRunning={cell.status === 'running'}
                      datasetFiles={datasetCompletionFiles}
                    />
                  ))}
                </div>
              )}

              {/* AI thinking indicator */}
              {isAiThinking && (
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-700 dark:text-purple-300">
                      AI is thinking...
                    </span>
                  </CardContent>
                </Card>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* AI Chat Input */}
          <div className="border-t bg-background p-4 shrink-0">
            <div className="max-w-5xl mx-auto space-y-2">
              <InputGroup>
                <InputGroupTextarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask AI for help with training, tuning, or debugging..."
                  disabled={isAiThinking}
                  className="min-h-[90px]"
                />
                <InputGroupAddon align="block-end" className="border-t border-border/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={assistantModel} onValueChange={setAssistantModel}>
                      <SelectTrigger className="h-7 w-[170px] text-xs">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSISTANT_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={assistantReasoning} onValueChange={setAssistantReasoning}>
                      <SelectTrigger className="h-7 w-[130px] text-xs">
                        <SelectValue placeholder="Reasoning" />
                      </SelectTrigger>
                      <SelectContent>
                        {REASONING_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[11px] gap-1">
                      <Brain className="h-3 w-3" />
                      {documentFiles.length} doc{documentFiles.length === 1 ? '' : 's'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachmentStatus === 'uploading'}
                      title="Attach context file"
                    >
                      {attachmentStatus === 'uploading' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Paperclip className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <InputGroupButton
                      size="sm"
                      onClick={handleChatSubmit}
                      disabled={!chatInput.trim() || isAiThinking}
                      variant="ghost"
                      className="h-9 w-9 rounded-full border border-foreground/20 bg-transparent p-0 text-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:bg-foreground/10 focus-visible:ring-foreground/30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </InputGroupButton>
                  </div>
                </InputGroupAddon>
              </InputGroup>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.md,.txt"
                onChange={handleAttachFile}
                className="hidden"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Enter to send, Shift+Enter for newline.
                </span>
                {attachmentMessage && (
                  <span
                    className={cn(
                      'text-xs',
                      attachmentStatus === 'success' && 'text-emerald-600',
                      attachmentStatus === 'error' && 'text-destructive'
                    )}
                  >
                    {attachmentMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
