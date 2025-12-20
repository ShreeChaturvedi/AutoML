import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/stores/dataStore';
import { useFeatureStore } from '@/stores/featureStore';
import { fetchFeaturePlan, applyFeatureEngineering } from '@/lib/api/featureEngineering';
import { generateFeatureEngineeringCode } from '@/lib/features/codeGenerator';
import type { FeatureSpec, FeatureTemplate } from '@/types/feature';
import { FEATURE_TEMPLATES } from '@/types/feature';
import type { FeaturePlan, FeatureSuggestion } from '@/types/featurePlan';
import { FeatureSuggestionCard } from './FeatureSuggestionCard';
import { FeatureSelectionCard } from './FeatureSelectionCard';
import { FeaturePreviewPanel } from './FeaturePreviewPanel';
import { FeatureCreationDialog } from './FeatureCreationDialog';
import { cn } from '@/lib/utils';
import { Loader2, Plus, RefreshCcw, Code } from 'lucide-react';

interface FeatureEngineeringPanelProps {
  projectId: string;
}

type FeatureSuggestionState = FeatureSuggestion & { enabled: boolean; origin: 'plan' | 'custom' };

type PlanStatus = 'idle' | 'loading' | 'error';

type CategoryFilter = FeatureSuggestion['category'] | 'all';

type FeatureSuggestionUpdate = Partial<FeatureSuggestionState>;

export function FeatureEngineeringPanel({ projectId }: FeatureEngineeringPanelProps) {
  const allFiles = useDataStore((state) => state.files);
  const previews = useDataStore((state) => state.previews);
  const hydrateFromBackend = useDataStore((state) => state.hydrateFromBackend);

  const features = useFeatureStore((state) => state.features);
  const upsertFeature = useFeatureStore((state) => state.upsertFeature);
  const removeFeature = useFeatureStore((state) => state.removeFeature);
  const hydrateFeatures = useFeatureStore((state) => state.hydrateFromProject);

  const files = useMemo(
    () => allFiles.filter((file) => file.projectId === projectId),
    [allFiles, projectId]
  );
  const datasetFiles = useMemo(
    () => files.filter((file) => ['csv', 'json', 'excel'].includes(file.type)),
    [files]
  );

  const projectFeatures = useMemo(
    () => features.filter((feature) => feature.projectId === projectId),
    [features, projectId]
  );

  const featureById = useMemo(() => {
    return new Map(projectFeatures.map((feature) => [feature.id, feature]));
  }, [projectFeatures]);

  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState<string | undefined>();
  const [plan, setPlan] = useState<FeaturePlan | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('idle');
  const [planError, setPlanError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FeatureSuggestionState[]>([]);
  const [focusedSuggestionId, setFocusedSuggestionId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');
  const [outputFormat, setOutputFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');

  const selectedDatasetFile = useMemo(
    () => datasetFiles.find((file) => file.id === selectedDataset),
    [datasetFiles, selectedDataset]
  );

  const selectedPreview = useMemo(() => {
    if (!selectedDataset) return undefined;
    return previews.find((preview) => preview.fileId === selectedDataset);
  }, [previews, selectedDataset]);

  useEffect(() => {
    hydrateFromBackend(projectId);
    hydrateFeatures(projectId);
  }, [projectId, hydrateFromBackend, hydrateFeatures]);

  useEffect(() => {
    if (!selectedDataset && datasetFiles.length > 0) {
      setSelectedDataset(datasetFiles[0].id);
    }
  }, [datasetFiles, selectedDataset]);

  useEffect(() => {
    if (!selectedDatasetFile) return;
    if (selectedDatasetFile.type === 'excel') {
      setOutputFormat('xlsx');
    } else if (selectedDatasetFile.type === 'json') {
      setOutputFormat('json');
    } else {
      setOutputFormat('csv');
    }
  }, [selectedDatasetFile]);

  useEffect(() => {
    if (!applyMessage) return;
    const timer = setTimeout(() => {
      setApplyMessage(null);
      setApplyStatus('idle');
    }, 4000);
    return () => clearTimeout(timer);
  }, [applyMessage]);

  const refreshPlan = useCallback(async (datasetId?: string, nextTarget?: string) => {
    if (!datasetId || !projectId) return;
    setPlanStatus('loading');
    setPlanError(null);

    try {
      const nextPlan = await fetchFeaturePlan({
        projectId,
        datasetId,
        targetColumn: nextTarget
      });
      setPlan(nextPlan);

      const currentFeatures = useFeatureStore.getState().features.filter(
        (feature) => feature.projectId === projectId
      );
      const currentFeatureById = new Map(currentFeatures.map((feature) => [feature.id, feature]));

      const merged = nextPlan.suggestions.map((suggestion) => {
        const existing = currentFeatureById.get(suggestion.id);
        const params = existing?.params ?? suggestion.params;
        const secondaryColumn = existing?.secondaryColumn ?? suggestion.secondaryColumn;
        const syncedControls = syncControls(suggestion.controls, params, secondaryColumn);

        return {
          ...suggestion,
          enabled: Boolean(existing?.enabled),
          params,
          featureName: existing?.featureName ?? suggestion.featureName,
          description: existing?.description ?? suggestion.description,
          secondaryColumn,
          controls: syncedControls,
          origin: 'plan' as const
        };
      });

      const customSuggestions = currentFeatures
        .filter((feature) => !nextPlan.suggestions.some((suggestion) => suggestion.id === feature.id))
        .map((feature) => buildCustomSuggestion(feature, nextPlan.columns));

      setSuggestions([...merged, ...customSuggestions]);
      setPlanStatus('idle');
    } catch (error) {
      setPlanStatus('error');
      setPlanError(error instanceof Error ? error.message : 'Failed to generate feature plan');
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedDatasetFile?.metadata?.datasetId) {
      void refreshPlan(selectedDatasetFile.metadata.datasetId, targetColumn);
    }
  }, [selectedDatasetFile?.metadata?.datasetId, targetColumn, refreshPlan]);

  useEffect(() => {
    if (!plan || targetColumn || plan.columns.length === 0) return;
    setTargetColumn(plan.columns[0].name);
  }, [plan, targetColumn]);

  useEffect(() => {
    if (!plan) return;
    const existingIds = new Set(suggestions.map((suggestion) => suggestion.id));
    const custom = projectFeatures.filter((feature) => !existingIds.has(feature.id));
    if (custom.length === 0) return;
    setSuggestions((prev) => [
      ...prev,
      ...custom.map((feature) => buildCustomSuggestion(feature, plan.columns))
    ]);
  }, [plan, projectFeatures, suggestions]);

  const planSuggestions = useMemo(() => suggestions.filter((suggestion) => suggestion.origin === 'plan'), [suggestions]);

  const filteredSuggestions = useMemo(() => {
    if (categoryFilter === 'all') return planSuggestions;
    return planSuggestions.filter((suggestion) => suggestion.category === categoryFilter);
  }, [planSuggestions, categoryFilter]);

  const enabledSuggestions = useMemo(() => suggestions.filter((suggestion) => suggestion.enabled), [suggestions]);

  const focusedSuggestion = useMemo(() => {
    if (!focusedSuggestionId) return undefined;
    return suggestions.find((suggestion) => suggestion.id === focusedSuggestionId);
  }, [focusedSuggestionId, suggestions]);

  const datasetColumns = useMemo(() => {
    return plan?.columns ?? [];
  }, [plan]);

  const handleSuggestionUpdate = useCallback((id: string, updater: (suggestion: FeatureSuggestionState) => FeatureSuggestionState) => {
    setSuggestions((prev) => prev.map((suggestion) => (suggestion.id === id ? updater(suggestion) : suggestion)));
  }, []);

  const syncSuggestionToStore = useCallback((suggestion: FeatureSuggestionState) => {
    if (!suggestion.enabled) {
      removeFeature(suggestion.id);
      return;
    }

    const existing = featureById.get(suggestion.id);
    const feature: FeatureSpec = {
      id: suggestion.id,
      projectId,
      sourceColumn: suggestion.sourceColumn,
      secondaryColumn: suggestion.secondaryColumn,
      featureName: suggestion.featureName,
      description: suggestion.description,
      method: suggestion.method,
      category: suggestion.category,
      params: suggestion.params,
      enabled: true,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
    upsertFeature(feature);
  }, [featureById, projectId, removeFeature, upsertFeature]);

  const handleToggleSuggestion = useCallback((id: string, enabled: boolean) => {
    handleSuggestionUpdate(id, (suggestion) => {
      const next = { ...suggestion, enabled };
      syncSuggestionToStore(next);
      return next;
    });
  }, [handleSuggestionUpdate, syncSuggestionToStore]);

  const handleControlChange = useCallback((id: string, controlKey: string, value: unknown) => {
    handleSuggestionUpdate(id, (suggestion) => {
      const nextParams = { ...suggestion.params, [controlKey]: value };
      const nextControls = suggestion.controls.map((control) =>
        control.key === controlKey ? { ...control, value } : control
      );
      const nextSuggestion: FeatureSuggestionState = {
        ...suggestion,
        params: nextParams,
        controls: nextControls,
        secondaryColumn: controlKey === 'secondaryColumn' ? String(value) : suggestion.secondaryColumn
      };
      if (nextSuggestion.enabled) {
        syncSuggestionToStore(nextSuggestion);
      }
      return nextSuggestion;
    });
  }, [handleSuggestionUpdate, syncSuggestionToStore]);

  const handleFeatureNameChange = useCallback((id: string, value: string) => {
    handleSuggestionUpdate(id, (suggestion) => {
      const nextSuggestion = { ...suggestion, featureName: value };
      if (nextSuggestion.enabled) {
        syncSuggestionToStore(nextSuggestion);
      }
      return nextSuggestion;
    });
  }, [handleSuggestionUpdate, syncSuggestionToStore]);

  const handleFeatureDescriptionChange = useCallback((id: string, value: string) => {
    handleSuggestionUpdate(id, (suggestion) => {
      const nextSuggestion = { ...suggestion, description: value };
      if (nextSuggestion.enabled) {
        syncSuggestionToStore(nextSuggestion);
      }
      return nextSuggestion;
    });
  }, [handleSuggestionUpdate, syncSuggestionToStore]);

  const handleApplyFeatures = useCallback(async () => {
    if (!selectedDatasetFile?.metadata?.datasetId) {
      setApplyStatus('error');
      setApplyMessage('Select a dataset to apply features.');
      return;
    }

    const enabledFeatures = projectFeatures.filter((feature) => feature.enabled);
    if (enabledFeatures.length === 0) {
      setApplyStatus('error');
      setApplyMessage('Enable at least one feature.');
      return;
    }

    const missingSecondary = enabledFeatures.find(
      (feature) =>
        ['ratio', 'difference', 'product'].includes(feature.method) &&
        !feature.secondaryColumn
    );
    if (missingSecondary) {
      setApplyStatus('error');
      setApplyMessage(`"${missingSecondary.featureName}" needs a secondary column.`);
      return;
    }

    const missingTarget = enabledFeatures.find(
      (feature) =>
        feature.method === 'target_encode' &&
        typeof feature.params?.targetColumn !== 'string'
    );
    if (missingTarget) {
      setApplyStatus('error');
      setApplyMessage(`"${missingTarget.featureName}" needs a target column.`);
      return;
    }

    setApplyStatus('loading');
    setApplyMessage(null);

    try {
      const response = await applyFeatureEngineering({
        projectId,
        datasetId: selectedDatasetFile.metadata.datasetId,
        outputName: outputName.trim() || undefined,
        outputFormat,
        features: enabledFeatures
      });

      await hydrateFromBackend(projectId, { force: true });
      setSelectedDataset(response.dataset.datasetId);
      setApplyStatus('success');
      setApplyMessage(`Created ${response.dataset.filename}`);
      setOutputName('');
    } catch (error) {
      setApplyStatus('error');
      setApplyMessage(error instanceof Error ? error.message : 'Failed to apply features.');
    }
  }, [hydrateFromBackend, outputFormat, outputName, projectFeatures, projectId, selectedDatasetFile]);

  const codePreview = useMemo(() => {
    if (!selectedDatasetFile) return '';
    const enabled = projectFeatures.filter((feature) => feature.enabled);
    if (enabled.length === 0) return '';
    return generateFeatureEngineeringCode(enabled, selectedDatasetFile.name, {
      datasetId: selectedDatasetFile.metadata?.datasetId,
      includeComments: true
    });
  }, [projectFeatures, selectedDatasetFile]);

  const handleCopyCode = useCallback(async () => {
    if (!codePreview) return;
    await navigator.clipboard.writeText(codePreview);
  }, [codePreview]);

  const categories = useMemo(() => {
    const unique = new Set<FeatureSuggestion['category']>();
    planSuggestions.forEach((suggestion) => unique.add(suggestion.category));
    return Array.from(unique);
  }, [planSuggestions]);

  const isPlanEmpty = planStatus !== 'loading' && planSuggestions.length === 0;

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-card">
      <div className="w-[340px] border-r bg-muted/20 flex flex-col">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-workflow-label uppercase tracking-wide">Dataset</Label>
            <Select
              value={selectedDataset ?? ''}
              onValueChange={(value) => setSelectedDataset(value)}
              disabled={datasetFiles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose dataset..." />
              </SelectTrigger>
              <SelectContent>
                {datasetFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {datasetFiles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Upload a dataset to start planning features.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-workflow-label uppercase tracking-wide">Target</Label>
            <Select
              value={targetColumn ?? ''}
              onValueChange={(value) => setTargetColumn(value)}
              disabled={!plan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target column" />
              </SelectTrigger>
              <SelectContent>
                {datasetColumns.map((column) => (
                  <SelectItem key={column.name} value={column.name}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Plan Summary</p>
                <p className="text-xs text-muted-foreground">Data-driven recommendations</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refreshPlan(selectedDatasetFile?.metadata?.datasetId, targetColumn)}
                disabled={planStatus === 'loading' || !selectedDatasetFile?.metadata?.datasetId}
                className="hover:rotate-90 transition-transform"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>

            {plan ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border bg-background p-2">
                  <p className="text-muted-foreground">Rows</p>
                  <p className="font-semibold text-foreground">{plan.dataset.nRows}</p>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <p className="text-muted-foreground">Columns</p>
                  <p className="font-semibold text-foreground">{plan.dataset.nCols}</p>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <p className="text-muted-foreground">Suggestions</p>
                  <p className="font-semibold text-foreground">{plan.suggestions.length}</p>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <p className="text-muted-foreground">Enabled</p>
                  <p className="font-semibold text-foreground">{enabledSuggestions.length}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Generate a plan to see dataset insights.</p>
            )}

            {planError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {planError}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-workflow-label uppercase tracking-wide">Filter</Label>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Suggestions</p>
          <Badge variant="secondary" className="text-[10px]">
            {filteredSuggestions.length}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-2">
            {planStatus === 'loading' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building feature plan...
              </div>
            )}
            {isPlanEmpty && (
              <div className="text-xs text-muted-foreground py-6">
                No suggestions yet. Pick a dataset to generate a plan.
              </div>
            )}
            {filteredSuggestions.map((suggestion) => (
              <FeatureSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                enabled={suggestion.enabled}
                active={suggestion.id === focusedSuggestionId}
                onToggle={(enabled) => handleToggleSuggestion(suggestion.id, enabled)}
                onFocus={() => setFocusedSuggestionId(suggestion.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-lg font-semibold">Feature Set</p>
            <p className="text-sm text-muted-foreground">
              Review, tune, and apply engineered features for this project.
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Custom Feature
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Apply features</p>
              <p className="text-xs text-muted-foreground">
                Generate a fresh dataset version with the enabled features below.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {enabledSuggestions.length} enabled
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr,0.8fr,auto]">
            <Input
              value={outputName}
              onChange={(event) => setOutputName(event.target.value)}
              placeholder="Output dataset name (optional)"
            />
            <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as 'csv' | 'json' | 'xlsx')}>
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleApplyFeatures}
              disabled={applyStatus === 'loading' || enabledSuggestions.length === 0 || !selectedDatasetFile}
              className="min-w-[160px] bg-foreground text-background hover:bg-foreground/90"
            >
              {applyStatus === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </span>
              ) : (
                'Apply Features'
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Source dataset: {selectedDatasetFile?.name ?? 'None selected'}
            </span>
            <span>Output format: {outputFormat.toUpperCase()}</span>
          </div>

          {applyMessage && (
            <div
              className={cn(
                'rounded-md border px-3 py-2 text-xs',
                applyStatus === 'success'
                  ? 'border-emerald-500/40 text-emerald-600'
                  : 'border-destructive/40 text-destructive'
              )}
            >
              {applyMessage}
            </div>
          )}
        </div>

        <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[1.1fr,0.9fr]">
          <div className="flex flex-col overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Selected Features</p>
                <p className="text-xs text-muted-foreground">Edit names and parameters</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {enabledSuggestions.length}
              </Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-4">
                {enabledSuggestions.length === 0 && (
                  <div className="rounded-md border border-dashed p-6 text-xs text-muted-foreground text-center">
                    Toggle suggestions to build your feature set.
                  </div>
                )}
                {enabledSuggestions.map((suggestion) => (
                  <FeatureSelectionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    active={suggestion.id === focusedSuggestionId}
                    onToggle={(enabled) => handleToggleSuggestion(suggestion.id, enabled)}
                    onNameChange={(value) => handleFeatureNameChange(suggestion.id, value)}
                    onDescriptionChange={(value) => handleFeatureDescriptionChange(suggestion.id, value)}
                    onControlChange={(key, value) => handleControlChange(suggestion.id, key, value)}
                    onFocus={() => setFocusedSuggestionId(suggestion.id)}
                    onRemove={() => handleToggleSuggestion(suggestion.id, false)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-hidden rounded-lg border">
              <FeaturePreviewPanel feature={focusedSuggestion} rows={selectedPreview?.rows ?? []} />
            </div>
            <div className="flex flex-col overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">Code Preview</p>
                    <p className="text-xs text-muted-foreground">Python code for the enabled features</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  disabled={!codePreview}
                >
                  Copy
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                  {codePreview || 'Enable features to generate code.'}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <FeatureCreationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        columns={datasetColumns.map((column) => ({
          columnName: column.name,
          dataType: column.role === 'numeric' ? 'numeric' : column.role === 'datetime' ? 'datetime' : column.role === 'text' ? 'text' : column.role === 'boolean' ? 'boolean' : 'categorical',
          uniqueValues: column.uniqueCount ?? 0,
          missingValues: column.nullCount,
          missingPercentage: column.missingPercentage,
          min: column.min,
          max: column.max,
          mean: column.mean,
          median: column.median,
          std: column.stdDev
        }))}
      />
    </div>
  );
}

function syncControls(
  controls: FeatureSuggestion['controls'],
  params: Record<string, unknown>,
  secondaryColumn?: string
) {
  return controls.map((control) => {
    let value = params[control.key];
    if (value === undefined && control.key === 'secondaryColumn' && secondaryColumn) {
      value = secondaryColumn;
    }
    if (value === undefined) {
      value = control.value;
    }
    return { ...control, value };
  });
}

function buildCustomSuggestion(feature: FeatureSpec, columns: FeaturePlan['columns']): FeatureSuggestionState {
  const template = FEATURE_TEMPLATES.find((item) => item.method === feature.method);
  const controls = template ? buildControlsFromTemplate(template, feature, columns) : [];

  return {
    id: feature.id,
    displayName: template?.displayName ?? feature.featureName,
    method: feature.method,
    category: (template?.category ?? feature.category ?? 'numeric_transform') as FeatureSuggestion['category'],
    sourceColumn: feature.sourceColumn,
    secondaryColumn: feature.secondaryColumn,
    featureName: feature.featureName,
    description: feature.description ?? template?.description ?? 'Custom feature',
    rationale: feature.description ?? template?.description ?? 'Custom feature',
    impact: 'low',
    score: 0,
    params: feature.params ?? {},
    controls,
    tags: ['custom'],
    enabled: feature.enabled ?? true,
    origin: 'custom'
  };
}

function buildControlsFromTemplate(
  template: FeatureTemplate,
  feature: FeatureSpec,
  columns: FeaturePlan['columns']
) {
  const options = columns.map((column) => ({ value: column.name, label: column.name }));
  const numericOptions = columns
    .filter((column) => column.role === 'numeric')
    .map((column) => ({ value: column.name, label: column.name }));

  return Object.entries(template.params).map(([key, config]) => {
    const value = feature.params?.[key] ?? config.default;
    const isColumn = config.type === 'column';
    const optionList = isColumn
      ? key === 'secondaryColumn'
        ? numericOptions.filter((opt) => opt.value !== feature.sourceColumn)
        : options
      : config.options;

    return {
      key,
      label: config.label,
      type: config.type === 'string' ? 'text' : config.type,
      value,
      min: config.min,
      max: config.max,
      step: config.step,
      options: optionList
    };
  });
}
