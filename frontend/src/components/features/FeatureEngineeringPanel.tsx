import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useDataStore } from '@/stores/dataStore';
import { useFeatureStore } from '@/stores/featureStore';
import type { ColumnStatistics } from '@/types/file';
import { FeatureCard } from './FeatureCard';
import { FeatureSuggestions } from './FeatureSuggestions';
import { FeatureCreationDialog } from './FeatureCreationDialog';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { applyFeatureEngineering } from '@/lib/api/featureEngineering';

interface FeatureEngineeringPanelProps {
  projectId: string;
}

export function FeatureEngineeringPanel({ projectId }: FeatureEngineeringPanelProps) {
  // IMPORTANT: Use stable selectors to avoid infinite loops
  // Never call .filter() directly inside a Zustand selector - it creates new arrays every render
  const allFiles = useDataStore((state) => state.files);
  const previews = useDataStore((state) => state.previews);
  const allFeatures = useFeatureStore((state) => state.features);
  const hydrateFeatures = useFeatureStore((state) => state.hydrateFromProject);
  
  // Filter in useMemo to maintain stable references
  const files = useMemo(
    () => allFiles.filter((file) => file.projectId === projectId),
    [allFiles, projectId]
  );
  const features = useMemo(
    () => allFeatures.filter((feature) => feature.projectId === projectId),
    [allFeatures, projectId]
  );

  useEffect(() => {
    hydrateFeatures(projectId);
  }, [projectId, hydrateFeatures]);
  
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [presetTemplateId, setPresetTemplateId] = useState<string | undefined>();
  const [presetColumn, setPresetColumn] = useState<string | undefined>();
  const [outputName, setOutputName] = useState('');
  const [outputFormat, setOutputFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const datasetFiles = useMemo(
    () => files.filter((file) => ['csv', 'json', 'excel'].includes(file.type)),
    [files]
  );
  const selectedDatasetFile = useMemo(
    () => datasetFiles.find((file) => file.id === selectedDataset),
    [datasetFiles, selectedDataset]
  );
  const enabledFeatures = useMemo(
    () => features.filter((feature) => feature.enabled),
    [features]
  );

  const hydrateFromBackend = useDataStore((state) => state.hydrateFromBackend);

  useEffect(() => {
    if (!selectedDataset && datasetFiles.length > 0) {
      setSelectedDataset(datasetFiles[0].id);
    }
  }, [datasetFiles, selectedDataset]);

  useEffect(() => {
    hydrateFromBackend(projectId);
  }, [projectId, hydrateFromBackend]);

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

  const datasetColumns = useMemo<ColumnStatistics[]>(() => {
    if (!selectedDataset) return [];
    const preview = previews.find((p) => p.fileId === selectedDataset);
    if (!preview) return [];
    if (preview.statistics && preview.statistics.length > 0) {
      return preview.statistics;
    }
    return preview.headers.map((header) => ({
      columnName: header,
      dataType: 'numeric',
      uniqueValues: 0,
      missingValues: 0,
      missingPercentage: 0
    }));
  }, [previews, selectedDataset]);

  const handleOpenDialog = (templateId?: string, column?: string) => {
    setPresetTemplateId(templateId);
    setPresetColumn(column);
    setIsCreateDialogOpen(true);
  };

  const handleApplyFeatures = async () => {
    if (!selectedDatasetFile?.metadata?.datasetId) {
      setApplyStatus('error');
      setApplyMessage('Select a dataset to apply features.');
      return;
    }
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
  };

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-card">
      <div className="w-96 border-r p-4 space-y-4 bg-muted/30">
        <div className="space-y-2">
          <Label>Select dataset</Label>
          <Select
            value={selectedDataset ?? ''}
            onValueChange={setSelectedDataset}
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
              Upload a CSV, JSON, or Excel file to start engineering features.
            </p>
          )}
        </div>

        <Separator />

        {selectedDataset ? (
          <FeatureSuggestions
            columns={datasetColumns}
            onAddFeature={(templateId, columnName) => handleOpenDialog(templateId, columnName)}
          />
        ) : (
          <div className="text-xs text-muted-foreground">Select a dataset to see suggestions.</div>
        )}
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-lg font-semibold">Engineered Features</p>
            <p className="text-sm text-muted-foreground">
              Create derived columns, encodings, and transformations tied to this project.
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Feature
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
              {enabledFeatures.length} enabled
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
              disabled={applyStatus === 'loading' || enabledFeatures.length === 0 || !selectedDatasetFile}
              className="min-w-[140px]"
            >
              {applyStatus === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
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
              className={`rounded-md border px-3 py-2 text-xs ${
                applyStatus === 'success'
                  ? 'border-emerald-500/40 text-emerald-600'
                  : 'border-destructive/40 text-destructive'
              }`}
            >
              {applyMessage}
            </div>
          )}
        </div>

        {features.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed">
            <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No features yet</p>
            <p className="text-xs text-muted-foreground">
              Use suggestions on the left or create a custom feature.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-auto pr-1">
            {features.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        )}
      </div>

      <FeatureCreationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        columns={datasetColumns}
        presetTemplateId={presetTemplateId}
        presetColumn={presetColumn}
      />
    </div>
  );
}
