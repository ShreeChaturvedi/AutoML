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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Database,
  Wand2,
  Paperclip,
  Brain,
  ArrowUp,
  Square
} from 'lucide-react';
import { CodeCell } from './CodeCell';
import { RuntimeToggle } from './RuntimeToggle';
import { RuntimeManagerDialog } from './RuntimeManagerDialog';
import type { Cell } from '@/types/cell';
import type { ModelTemplate } from '@/types/model';
import { uploadDocument } from '@/lib/api/documents';
import { downloadDataset } from '@/lib/api/datasets';
import { executeToolCalls, streamTrainingPlan } from '@/lib/api/llm';
import { cn } from '@/lib/utils';
import { useExecutionStore } from '@/stores/executionStore';
import { useDataStore } from '@/stores/dataStore';
import { useFeatureStore } from '@/stores/featureStore';
import { generateFeatureEngineeringCode } from '@/lib/features/codeGenerator';
import { getFileType, type UploadedFile } from '@/types/file';
import type { ToolCall, ToolResult, UiItem, UiSchema } from '@/types/llmUi';
import { LlmToolPanel } from '@/components/llm/LlmToolPanel';
import { useToolApproval } from '@/hooks/useToolApproval';
import { generateModelTrainingCode } from '@/lib/training/modelCode';

const ASSISTANT_MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
];

const REASONING_MODES = [
  { value: 'auto', label: 'Auto' }
];

const stripJsonFence = (text: string) =>
  text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();

export function TrainingPanel() {
  const { projectId } = useParams<{ projectId: string }>();

  const [selectedModel, setSelectedModel] = useState<ModelTemplate | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODELS[0].value);
  const [assistantReasoning, setAssistantReasoning] = useState(REASONING_MODES[0].value);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [mountedDatasets, setMountedDatasets] = useState<Set<string>>(new Set());
  const [mountingDatasets, setMountingDatasets] = useState(false);
  const [attachmentStatus, setAttachmentStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle');
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [trainingPrompt, setTrainingPrompt] = useState('');
  const [trainingText, setTrainingText] = useState('');
  const [trainingUi, setTrainingUi] = useState<UiSchema | null>(null);
  const [trainingToolCalls, setTrainingToolCalls] = useState<ToolCall[]>([]);
  const [trainingToolResults, setTrainingToolResults] = useState<ToolResult[]>([]);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [isTrainingGenerating, setIsTrainingGenerating] = useState(false);
  const [isTrainingToolsRunning, setIsTrainingToolsRunning] = useState(false);
  const [trainingDatasetId, setTrainingDatasetId] = useState<string | null>(null);
  const [trainingTargetColumn, setTrainingTargetColumn] = useState<string | undefined>();
  const cleanedTrainingText = useMemo(() => stripJsonFence(trainingText), [trainingText]);
  const { approved: toolsApproved, approve: approveTools } = useToolApproval();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trainingAbortRef = useRef<AbortController | null>(null);
  const autoRunIdsRef = useRef(new Set<string>());

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
  const hydrateFromBackend = useDataStore((s) => s.hydrateFromBackend);
  const projectFiles = useMemo(() =>
    projectId ? files.filter(f => f.projectId === projectId) : [],
    [files, projectId]
  );
  const datasetFiles = useMemo(
    () => projectFiles.filter((file) => file.metadata?.datasetId),
    [projectFiles]
  );
  const trainingDatasetOptions = useMemo(
    () =>
      datasetFiles
        .map((file) => ({
          datasetId: file.metadata?.datasetId,
          name: file.name,
          columns: file.metadata?.columns ?? []
        }))
        .filter((file): file is { datasetId: string; name: string; columns: string[] } => Boolean(file.datasetId)),
    [datasetFiles]
  );
  const datasetCompletionFiles = useMemo(
    () => datasetFiles.map((file) => file.name),
    [datasetFiles]
  );
  const selectedTrainingFile = useMemo(
    () => datasetFiles.find((file) => file.metadata?.datasetId === trainingDatasetId),
    [datasetFiles, trainingDatasetId]
  );
  const documentFiles = useMemo(
    () => projectFiles.filter((file) => file.metadata?.documentId),
    [projectFiles]
  );

  const llmCodeCells = useMemo(() => {
    if (!trainingUi) return [];
    return trainingUi.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.type === 'code_cell'
          ? [{
              id: item.id,
              content: item.content,
              autoRun: item.autoRun ?? false,
              title: item.title
            }]
          : []
      )
    );
  }, [trainingUi]);
  const manualCells = useMemo(
    () => cells.filter((cell) => !cell.id.startsWith('llm-')),
    [cells]
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

  useEffect(() => {
    if (!projectId) return;
    hydrateFromBackend(projectId);
  }, [projectId, hydrateFromBackend]);

  useEffect(() => {
    if (!trainingDatasetId && trainingDatasetOptions.length > 0) {
      setTrainingDatasetId(trainingDatasetOptions[0].datasetId);
    }
  }, [trainingDatasetId, trainingDatasetOptions]);

  useEffect(() => {
    const selected = trainingDatasetOptions.find((dataset) => dataset.datasetId === trainingDatasetId);
    if (!selected) return;
    if (!trainingTargetColumn || !selected.columns.includes(trainingTargetColumn)) {
      setTrainingTargetColumn(selected.columns[0]);
    }
  }, [trainingDatasetOptions, trainingDatasetId, trainingTargetColumn]);

  useEffect(() => {
    if (llmCodeCells.length === 0) return;
    setCells((prev) => {
      const manualCells = prev.filter((cell) => !cell.id.startsWith('llm-'));
      const existingMap = new Map(prev.map((cell) => [cell.id, cell]));
      const nextLlmCells = llmCodeCells.map((item) => {
        const id = `llm-${item.id}`;
        const existing = existingMap.get(id);
        if (existing) {
          if (existing.content === item.content) return existing;
          return { ...existing, content: item.content };
        }
        return {
          id,
          type: 'code',
          content: item.content,
          status: 'idle',
          createdAt: new Date().toISOString()
        };
      });
      return [...manualCells, ...nextLlmCells];
    });
  }, [llmCodeCells]);

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
          await mountDatasetFile(file.name, content);
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

  const buildFeatureSummary = useCallback(() => {
    if (projectFeatures.length === 0) return undefined;
    const names = projectFeatures.slice(0, 6).map((feature) => feature.featureName);
    const suffix = projectFeatures.length > 6 ? ` +${projectFeatures.length - 6} more` : '';
    return `${projectFeatures.length} enabled features: ${names.join(', ')}${suffix}`;
  }, [projectFeatures]);

  const handleGenerateTrainingPlan = useCallback(async (promptOverride?: string, toolResultsOverride?: ToolResult[]) => {
    if (!projectId || !selectedTrainingFile?.metadata?.datasetId) return;

    trainingAbortRef.current?.abort();
    const controller = new AbortController();
    trainingAbortRef.current = controller;

    const promptValue = (promptOverride ?? trainingPrompt).trim();

    setTrainingText('');
    setTrainingError(null);
    setTrainingUi(null);
    setTrainingToolCalls([]);
    setTrainingToolResults(toolResultsOverride ?? []);
    setIsTrainingGenerating(true);

    try {
      await streamTrainingPlan(
        {
          projectId,
          datasetId: selectedTrainingFile.metadata.datasetId,
          targetColumn: trainingTargetColumn,
          prompt: promptValue || undefined,
          toolResults: toolResultsOverride?.length ? toolResultsOverride : undefined,
          featureSummary: buildFeatureSummary()
        },
        (event) => {
          if (event.type === 'token') {
            setTrainingText((prev) => prev + event.text);
          }
          if (event.type === 'envelope') {
            if (event.envelope.tool_calls?.length) {
              setTrainingToolCalls(event.envelope.tool_calls);
              setTrainingUi(null);
            } else {
              setTrainingUi(event.envelope.ui ?? null);
              setTrainingToolCalls([]);
            }
          }
          if (event.type === 'error') {
            setTrainingError(event.message);
          }
          if (event.type === 'done') {
            setIsTrainingGenerating(false);
          }
        },
        controller.signal
      );
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setTrainingError(error instanceof Error ? error.message : 'Failed to generate training plan.');
      setIsTrainingGenerating(false);
    }
  }, [projectId, selectedTrainingFile, trainingTargetColumn, trainingPrompt, buildFeatureSummary]);

  const handleRunTrainingTools = useCallback(async () => {
    if (!trainingToolCalls.length || !projectId) return;
    setIsTrainingToolsRunning(true);
    try {
      const response = await executeToolCalls(projectId, trainingToolCalls);
      setTrainingToolResults(response.results);
      await handleGenerateTrainingPlan(trainingPrompt, response.results);
    } catch (error) {
      setTrainingError(error instanceof Error ? error.message : 'Failed to execute tools.');
    } finally {
      setIsTrainingToolsRunning(false);
    }
  }, [projectId, trainingToolCalls, handleGenerateTrainingPlan, trainingPrompt]);

  const handleStopTraining = useCallback(() => {
    trainingAbortRef.current?.abort();
    setIsTrainingGenerating(false);
  }, []);

  const buildTemplateFromDraft = useCallback((item: Extract<UiItem, { type: 'model_recommendation' }>): ModelTemplate => {
    const params = item.template.parameters.reduce<Record<string, unknown>>((acc, param) => {
      acc[param.key] = param.default;
      return acc;
    }, {});
    return {
      id: `llm_${item.id}`,
      name: item.template.name,
      taskType: item.template.taskType,
      description: item.rationale,
      library: item.template.library,
      importPath: item.template.importPath,
      modelClass: item.template.modelClass,
      parameters: item.template.parameters,
      defaultParams: params,
      metrics: item.template.metrics
    };
  }, []);

  const handleInsertRecommendation = useCallback((item: Extract<UiItem, { type: 'model_recommendation' }>) => {
    if (!selectedTrainingFile?.metadata?.datasetId) return;
    const template = buildTemplateFromDraft(item);
    const code = generateModelTrainingCode({
      template,
      datasetFilename: selectedTrainingFile.name,
      datasetId: selectedTrainingFile.metadata.datasetId,
      targetColumn: template.taskType === 'clustering' ? undefined : trainingTargetColumn,
      parameters: item.parameters
    });
    setSelectedModel(template);
    addCodeCell(code);
  }, [addCodeCell, buildTemplateFromDraft, selectedTrainingFile, trainingTargetColumn]);

  const renderTrainingItem = (item: UiItem) => {
    switch (item.type) {
      case 'dataset_summary':
        return (
          <Card key={item.datasetId} className="border-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dataset snapshot</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span>{item.filename}</span>
                <Badge variant="outline" className="text-[10px]">{item.rows} rows</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>{item.columns} columns</span>
                <Badge variant="secondary" className="text-[10px]">{item.datasetId.slice(0, 8)}</Badge>
              </div>
              {item.notes?.length ? (
                <ul className="space-y-1">
                  {item.notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        );
      case 'model_recommendation':
        return (
          <Card key={item.id} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.template.name}</p>
                  <p className="text-xs text-muted-foreground">{item.rationale}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{item.template.library}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {item.template.metrics.map((metric) => (
                  <Badge key={metric} variant="secondary" className="text-[10px]">{metric}</Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleInsertRecommendation(item)}
              >
                Insert training cell
              </Button>
            </CardContent>
          </Card>
        );
      case 'code_cell':
        {
          const cellId = `llm-${item.id}`;
          const cell = cells.find((entry) => entry.id === cellId);
          if (!cell) return null;
          const cellNumber = Math.max(1, cells.findIndex((entry) => entry.id === cellId) + 1);
          return (
            <div key={item.id} className="space-y-2">
              {item.title && <p className="text-xs font-medium text-muted-foreground">{item.title}</p>}
              <CodeCell
                cell={cell}
                cellNumber={cellNumber}
                onRun={cell.type === 'code' ? () => handleRunCell(cell.id) : undefined}
                onDelete={() => handleDeleteCell(cell.id)}
                onContentChange={cell.type === 'code' ? (content) => handleCellContentChange(cell.id, content) : undefined}
                isRunning={cell.status === 'running'}
                datasetFiles={datasetCompletionFiles}
              />
            </div>
          );
        }
      case 'callout':
        return (
          <div
            key={item.text}
            className={cn(
              'rounded-md border px-3 py-2 text-xs',
              item.tone === 'warning' && 'border-amber-500/40 text-amber-600',
              item.tone === 'success' && 'border-emerald-500/40 text-emerald-600'
            )}
          >
            {item.text}
          </div>
        );
      case 'action':
        return (
          <Button key={item.id} variant="outline" size="sm">
            {item.label}
          </Button>
        );
      default:
        return null;
    }
  };

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

  useEffect(() => {
    if (llmCodeCells.length === 0) return;
    llmCodeCells.forEach((item) => {
      if (!item.autoRun) return;
      const cellId = `llm-${item.id}`;
      if (autoRunIdsRef.current.has(cellId)) return;
      const cell = cells.find((entry) => entry.id === cellId);
      if (!cell || cell.status !== 'idle') return;
      autoRunIdsRef.current.add(cellId);
      void handleRunCell(cellId);
    });
  }, [cells, handleRunCell, llmCodeCells]);

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

  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || !projectId || isAiThinking) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setTrainingPrompt(userMessage);
    setIsAiThinking(true);

    try {
      await handleGenerateTrainingPlan(userMessage);
    } finally {
      setIsAiThinking(false);
      textareaRef.current?.focus();
    }
  }, [chatInput, projectId, isAiThinking, handleGenerateTrainingPlan]);

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
              {/* Training plan */}
              {projectId && (
                <Card className="border-muted/40">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm">Training plan</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          LLM-generated plan with model recommendations and code cells.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {trainingDatasetOptions.length} dataset{trainingDatasetOptions.length === 1 ? '' : 's'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,220px)_minmax(0,1fr)_auto]">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Dataset</Label>
                        <Select
                          value={trainingDatasetId ?? ''}
                          onValueChange={setTrainingDatasetId}
                          disabled={trainingDatasetOptions.length === 0}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select dataset" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainingDatasetOptions.map((dataset) => (
                              <SelectItem key={dataset.datasetId} value={dataset.datasetId}>
                                {dataset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Target</Label>
                        <Select
                          value={trainingTargetColumn ?? ''}
                          onValueChange={setTrainingTargetColumn}
                          disabled={!trainingDatasetOptions.length}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainingDatasetOptions
                              .find((dataset) => dataset.datasetId === trainingDatasetId)
                              ?.columns.map((column) => (
                                <SelectItem key={column} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Goal</Label>
                        <Input
                          value={trainingPrompt}
                          onChange={(event) => setTrainingPrompt(event.target.value)}
                          placeholder="What do you want to optimize?"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleGenerateTrainingPlan()}
                          disabled={!trainingDatasetId || isTrainingGenerating}
                        >
                          {isTrainingGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Generate
                        </Button>
                        {isTrainingGenerating && (
                          <Button variant="ghost" size="sm" onClick={handleStopTraining}>
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>

                    {cleanedTrainingText && (
                      <div className="rounded-md border border-muted/40 bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {cleanedTrainingText}
                      </div>
                    )}

                    {trainingError && (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {trainingError}
                      </div>
                    )}

                    <LlmToolPanel
                      toolCalls={trainingToolCalls}
                      results={trainingToolResults}
                      isRunning={isTrainingToolsRunning}
                      approvalGranted={toolsApproved}
                      onApprove={approveTools}
                      onRun={handleRunTrainingTools}
                    />

                    {trainingUi && (
                      <div className="space-y-3">
                        {trainingUi.sections.map((section) => (
                          <div key={section.id} className="space-y-3">
                            {section.title && <p className="text-sm font-semibold">{section.title}</p>}
                            <div
                              className={cn(
                                section.layout === 'grid' && 'grid gap-3',
                                section.layout === 'grid' && section.columns === 2 && 'md:grid-cols-2',
                                section.layout === 'grid' && section.columns === 3 && 'md:grid-cols-3',
                                (!section.layout || section.layout === 'column') && 'space-y-3'
                              )}
                            >
                              {section.items.map(renderTrainingItem)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">Notebook</p>
                        <Button variant="ghost" size="sm" onClick={() => addCodeCell()}>
                          <Plus className="h-3.5 w-3.5" />
                          Add cell
                        </Button>
                      </div>
                      {manualCells.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                          Add a code cell to start exploring the dataset or run custom training steps.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {manualCells.map((cell, index) => (
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
                    </div>
                  </CardContent>
                </Card>
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
                <InputGroupAddon align="block-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={assistantModel} onValueChange={setAssistantModel} disabled>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
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
                    <Select value={assistantReasoning} onValueChange={setAssistantReasoning} disabled>
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

                  <div className="ml-auto flex flex-wrap items-center gap-3">
                    <span className="text-[10px] text-muted-foreground/60">
                      ⇧ + ⏎ for newline
                    </span>
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
                      onClick={isAiThinking ? handleStopTraining : handleChatSubmit}
                      disabled={!chatInput.trim() && !isAiThinking}
                      variant="ghost"
                      className="h-9 w-9 rounded-full border border-foreground/30 bg-foreground p-0 text-background hover:bg-foreground/90 disabled:bg-muted/30 disabled:text-muted-foreground"
                    >
                      {isAiThinking ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
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

              {attachmentMessage && (
                <div className="text-xs text-muted-foreground">
                  <span
                    className={cn(
                      attachmentStatus === 'success' && 'text-emerald-600',
                      attachmentStatus === 'error' && 'text-destructive'
                    )}
                  >
                    {attachmentMessage}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
