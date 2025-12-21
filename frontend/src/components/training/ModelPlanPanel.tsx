import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { fetchModelPlan } from '@/lib/api/models';
import { generateModelTrainingCode } from '@/lib/training/modelCode';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/types/file';
import type { ModelTemplate, ModelTemplateParam } from '@/types/model';
import type { ModelPlan, ModelRecommendation, ModelPlanRequest } from '@/types/modelPlan';
import { Loader2, RefreshCcw, Code } from 'lucide-react';
import { ModelRecommendationCard } from './ModelRecommendationCard';

interface ModelPlanPanelProps {
  projectId: string;
  datasetFiles: UploadedFile[];
  onInsertCode: (code: string, template: ModelTemplate) => void;
  onSelectTemplate?: (template: ModelTemplate | null) => void;
}

type PlanStatus = 'idle' | 'loading' | 'error';

type DatasetOption = {
  fileId: string;
  datasetId: string;
  name: string;
  columns: string[];
  rowCount?: number;
  columnCount?: number;
};

const PROBLEM_TYPE_OPTIONS: Array<{ value: ModelPlanRequest['problemType']; label: string }> = [
  { value: 'unspecified', label: 'Auto detect' },
  { value: 'classification', label: 'Classification' },
  { value: 'regression', label: 'Regression' },
  { value: 'clustering', label: 'Clustering' }
];

export function ModelPlanPanel({
  projectId,
  datasetFiles,
  onInsertCode,
  onSelectTemplate
}: ModelPlanPanelProps) {
  const datasetOptions = useMemo<DatasetOption[]>(() => {
    return datasetFiles
      .map((file) => {
        const datasetId = file.metadata?.datasetId;
        if (!datasetId) return null;
        return {
          fileId: file.id,
          datasetId,
          name: file.name,
          columns: file.metadata?.columns ?? [],
          rowCount: file.metadata?.rowCount,
          columnCount: file.metadata?.columnCount
        };
      })
      .filter((item): item is DatasetOption => Boolean(item));
  }, [datasetFiles]);

  const [selectedDatasetFileId, setSelectedDatasetFileId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState<string | undefined>();
  const [problemType, setProblemType] = useState<ModelPlanRequest['problemType']>('unspecified');
  const [testSize, setTestSize] = useState(0.2);

  const [plan, setPlan] = useState<ModelPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('idle');
  const [planError, setPlanError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const selectedDataset = useMemo(
    () => datasetOptions.find((dataset) => dataset.fileId === selectedDatasetFileId) ?? null,
    [datasetOptions, selectedDatasetFileId]
  );

  const selectedRecommendation = useMemo(() => {
    const fallback = recommendations[0];
    return recommendations.find((rec) => rec.template.id === selectedTemplateId) ?? fallback ?? null;
  }, [recommendations, selectedTemplateId]);

  const taskBadge = useMemo(() => {
    if (!plan) return null;
    const label = plan.taskType.replace('_', ' ');
    return (
      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
        {label}
      </Badge>
    );
  }, [plan]);

  useEffect(() => {
    if (!selectedDatasetFileId && datasetOptions.length > 0) {
      setSelectedDatasetFileId(datasetOptions[0].fileId);
    }
  }, [datasetOptions, selectedDatasetFileId]);

  useEffect(() => {
    if (!selectedDataset) return;
    if (problemType === 'clustering') {
      setTargetColumn(undefined);
      return;
    }
    if (!targetColumn && selectedDataset.columns.length > 0) {
      setTargetColumn(selectedDataset.columns[0]);
    }
  }, [selectedDataset, problemType, targetColumn]);

  const refreshPlan = useCallback(async () => {
    if (!selectedDataset?.datasetId) return;
    setPlanStatus('loading');
    setPlanError(null);

    try {
      const request: ModelPlanRequest = {
        projectId,
        datasetId: selectedDataset.datasetId,
        targetColumn: problemType === 'clustering' ? undefined : targetColumn
      };
      if (problemType && problemType !== 'unspecified') {
        request.problemType = problemType;
      }

      const nextPlan = await fetchModelPlan(request);
      const nextTemplates = nextPlan.recommendations;

      setPlan(nextPlan);
      setRecommendations((prev) => {
        const previousParams = new Map(
          prev.map((rec) => [rec.template.id, rec.parameters])
        );
        return nextTemplates.map((rec) => ({
          ...rec,
          parameters: previousParams.get(rec.template.id) ?? rec.parameters
        }));
      });

      setSelectedTemplateId((prevSelected) => {
        const hasSelection = nextTemplates.some((rec) => rec.template.id === prevSelected);
        return hasSelection ? prevSelected : nextTemplates[0]?.template.id ?? null;
      });
      setPlanStatus('idle');
    } catch (error) {
      setPlanStatus('error');
      setPlanError(error instanceof Error ? error.message : 'Failed to generate model plan');
    }
  }, [projectId, selectedDataset?.datasetId, problemType, targetColumn]);

  useEffect(() => {
    void refreshPlan();
  }, [refreshPlan]);

  useEffect(() => {
    if (!onSelectTemplate) return;
    onSelectTemplate(selectedRecommendation?.template ?? null);
  }, [selectedRecommendation, onSelectTemplate]);

  const handleSelect = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
  }, []);

  const handleParamChange = useCallback((templateId: string, key: string, value: unknown) => {
    setRecommendations((prev) =>
      prev.map((rec) =>
        rec.template.id === templateId
          ? { ...rec, parameters: { ...rec.parameters, [key]: value } }
          : rec
      )
    );
  }, []);

  const handleInsert = useCallback(() => {
    if (!selectedRecommendation || !selectedDataset) return;

    const template = selectedRecommendation.template;
    const code = generateModelTrainingCode({
      template,
      datasetFilename: selectedDataset.name,
      datasetId: selectedDataset.datasetId,
      targetColumn: template.taskType === 'clustering' ? undefined : targetColumn,
      parameters: selectedRecommendation.parameters,
      testSize
    });

    onInsertCode(code, template);
  }, [onInsertCode, selectedRecommendation, selectedDataset, targetColumn, testSize]);

  const renderParamControl = (templateId: string, param: ModelTemplateParam, value: unknown) => {
    if (param.type === 'boolean') {
      return (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => handleParamChange(templateId, param.key, checked)}
        />
      );
    }

    if (param.type === 'select' && param.options) {
      return (
        <Select
          value={String(value ?? '')}
          onValueChange={(next) => handleParamChange(templateId, param.key, next)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const inputType = param.type === 'number' ? 'number' : 'text';
    return (
      <Input
        type={inputType}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(event) => {
          if (param.type === 'number') {
            const next = event.target.valueAsNumber;
            handleParamChange(templateId, param.key, Number.isNaN(next) ? value : next);
          } else {
            handleParamChange(templateId, param.key, event.target.value);
          }
        }}
        min={param.min}
        max={param.max}
        step={param.step}
        className="h-8 text-xs"
      />
    );
  };

  const hasDatasets = datasetOptions.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Model plan</CardTitle>
            <p className="text-xs text-muted-foreground">
              Curated recommendations based on your dataset profile.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {taskBadge}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refreshPlan}
              disabled={!hasDatasets || planStatus === 'loading'}
              className="hover:bg-foreground/10"
              title="Refresh plan"
            >
              {planStatus === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dataset</Label>
                <Select
                  value={selectedDatasetFileId ?? ''}
                  onValueChange={setSelectedDatasetFileId}
                  disabled={!hasDatasets}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasetOptions.map((dataset) => (
                      <SelectItem key={dataset.fileId} value={dataset.fileId}>
                        {dataset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDataset && (
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDataset.rowCount ?? '—'} rows ·{' '}
                    {selectedDataset.columnCount ?? selectedDataset.columns.length} columns
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Target column</Label>
                <Select
                  value={targetColumn ?? ''}
                  onValueChange={setTargetColumn}
                  disabled={!selectedDataset || problemType === 'clustering'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDataset?.columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {problemType === 'clustering' && (
                  <p className="text-[11px] text-muted-foreground">
                    Target disabled for clustering workflows.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Problem type</Label>
                <Select value={problemType ?? 'unspecified'} onValueChange={setProblemType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Auto detect" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBLEM_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value ?? 'auto'} value={option.value ?? 'unspecified'}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Test split</Label>
                <Input
                  type="number"
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  value={testSize}
                  onChange={(event) => {
                    const next = event.target.valueAsNumber;
                    if (!Number.isNaN(next)) {
                      setTestSize(next);
                    }
                  }}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {planStatus === 'error' && planError && (
              <p className="text-xs text-destructive">{planError}</p>
            )}

            {selectedRecommendation ? (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{selectedRecommendation.template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRecommendation.template.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedRecommendation.template.library}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">{selectedRecommendation.rationale}</p>

                {selectedRecommendation.template.metrics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedRecommendation.template.metrics.map((metric) => (
                      <Badge key={metric} variant="secondary" className="text-[10px]">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Parameters</p>
                  {selectedRecommendation.template.parameters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tunable parameters.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedRecommendation.template.parameters.map((param) => (
                        <div key={param.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">{param.label}</Label>
                            {param.min !== undefined && param.max !== undefined && (
                              <span className="text-[10px] text-muted-foreground">
                                {param.min}–{param.max}
                              </span>
                            )}
                          </div>
                          {renderParamControl(
                            selectedRecommendation.template.id,
                            param,
                            selectedRecommendation.parameters[param.key] ?? param.default
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInsert}
                  disabled={!selectedDataset}
                  className="w-full"
                >
                  <Code className="h-4 w-4" />
                  Insert training cell
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                Select a recommendation to see parameters.
              </div>
            )}
          </div>

          <div className={cn('space-y-3', !hasDatasets && 'opacity-60')}>
            {!hasDatasets && (
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                Upload a dataset to generate model recommendations.
              </div>
            )}

            {hasDatasets && (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendations.map((rec) => (
                  <ModelRecommendationCard
                    key={rec.template.id}
                    recommendation={rec}
                    selected={rec.template.id === selectedTemplateId}
                    onSelect={() => handleSelect(rec.template.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
