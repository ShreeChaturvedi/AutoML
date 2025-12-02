import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useDataStore } from '@/stores/dataStore';
import { useFeatureStore } from '@/stores/featureStore';
import type { ColumnStatistics } from '@/types/file';
import { FeatureCard } from './FeatureCard';
import { FeatureSuggestions } from './FeatureSuggestions';
import { FeatureCreationDialog } from './FeatureCreationDialog';
import { Sparkles, Plus } from 'lucide-react';

interface FeatureEngineeringPanelProps {
  projectId: string;
}

export function FeatureEngineeringPanel({ projectId }: FeatureEngineeringPanelProps) {
  // IMPORTANT: Use stable selectors to avoid infinite loops
  // Never call .filter() directly inside a Zustand selector - it creates new arrays every render
  const allFiles = useDataStore((state) => state.files);
  const previews = useDataStore((state) => state.previews);
  const allFeatures = useFeatureStore((state) => state.features);
  
  // Filter in useMemo to maintain stable references
  const files = useMemo(
    () => allFiles.filter((file) => file.projectId === projectId),
    [allFiles, projectId]
  );
  const features = useMemo(
    () => allFeatures.filter((feature) => feature.projectId === projectId),
    [allFeatures, projectId]
  );
  
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [presetTemplateId, setPresetTemplateId] = useState<string | undefined>();
  const [presetColumn, setPresetColumn] = useState<string | undefined>();

  const datasetFiles = useMemo(
    () => files.filter((file) => ['csv', 'json', 'excel'].includes(file.type)),
    [files]
  );

  useEffect(() => {
    if (!selectedDataset && datasetFiles.length > 0) {
      setSelectedDataset(datasetFiles[0].id);
    }
  }, [datasetFiles, selectedDataset]);

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
        <div className="flex items-center justify-between">
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
