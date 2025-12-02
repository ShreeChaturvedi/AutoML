/**
 * FeatureCreationDialog - Dialog for creating new features from templates
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Sparkles, ArrowRight } from 'lucide-react';
import type { ColumnStatistics } from '@/types/file';
import { 
  FEATURE_TEMPLATES, 
  getTemplatesByCategory, 
  featureCategoryConfig,
  type FeatureCategory
} from '@/types/feature';
import { useFeatureStore } from '@/stores/featureStore';
import { cn } from '@/lib/utils';

interface FeatureCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  columns: ColumnStatistics[];
  presetTemplateId?: string;
  presetColumn?: string;
}

export function FeatureCreationDialog({
  open,
  onOpenChange,
  projectId,
  columns,
  presetTemplateId,
  presetColumn
}: FeatureCreationDialogProps) {
  const addFeature = useFeatureStore((state) => state.addFeature);
  
  const [templateId, setTemplateId] = useState<string>('');
  const [column, setColumn] = useState<string>('');
  const [featureName, setFeatureName] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<Record<string, unknown>>({});

  const templatesByCategory = useMemo(() => getTemplatesByCategory(), []);

  // Find the selected template
  const template = useMemo(
    () => FEATURE_TEMPLATES.find((item) => item.id === templateId),
    [templateId]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    
    const initialTemplate = presetTemplateId ?? '';
    const initialColumn = presetColumn ?? columns[0]?.columnName ?? '';
    const foundTemplate = FEATURE_TEMPLATES.find((t) => t.id === initialTemplate);

    setTemplateId(initialTemplate);
    setColumn(initialColumn);
    setFeatureName('');
    setDescription('');
    
    // Initialize params from template defaults
    if (foundTemplate?.params) {
      const initialParams: Record<string, unknown> = {};
      for (const [key, config] of Object.entries(foundTemplate.params)) {
        initialParams[key] = config.default;
      }
      setParams(initialParams);
    } else {
      setParams({});
    }
  }, [columns, open, presetColumn, presetTemplateId]);

  // Update params when template changes
  useEffect(() => {
    if (template?.params) {
      const newParams: Record<string, unknown> = {};
      for (const [key, config] of Object.entries(template.params)) {
        newParams[key] = config.default;
      }
      setParams(newParams);
      setDescription('');
    }
  }, [template]);

  const derivedName = useMemo(() => {
    if (featureName) return featureName;
    if (column && template) return `${column}_${template.method}`;
    return '';
  }, [column, featureName, template]);

  const handleParamChange = (key: string, value: unknown) => {
    setParams((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = () => {
    if (!template || !column) return;

    addFeature({
      projectId,
      sourceColumn: column,
      featureName: derivedName || `${column}_${template.method}`,
      description: description || template.description,
      method: template.method,
      category: template.category,
      params
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Feature
          </DialogTitle>
          <DialogDescription>
            Select a transformation template and configure it for your data
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Template</Label>
              
              {!templateId ? (
                <div className="space-y-4">
                  {(Object.keys(templatesByCategory) as FeatureCategory[]).map(category => {
                    const templates = templatesByCategory[category];
                    if (templates.length === 0) return null;
                    
                    const config = featureCategoryConfig[category];
                    
                    return (
                      <div key={category}>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {config.label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {templates.slice(0, 4).map(tpl => (
                            <Button
                              key={tpl.id}
                              variant="outline"
                              size="sm"
                              className="justify-start h-auto py-2 px-3"
                              onClick={() => setTemplateId(tpl.id)}
                            >
                              <div className="text-left">
                                <span className="text-sm">{tpl.displayName}</span>
                                {tpl.previewFormula && (
                                  <span className="block text-[10px] text-muted-foreground font-mono">
                                    {tpl.previewFormula}
                                  </span>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(templatesByCategory) as FeatureCategory[]).map(category => {
                        const templates = templatesByCategory[category];
                        if (templates.length === 0) return null;
                        
                        const config = featureCategoryConfig[category];
                        
                        return (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {config.label}
                            </div>
                            {templates.map(tpl => (
                              <SelectItem key={tpl.id} value={tpl.id}>
                                <div className="flex items-center gap-2">
                                  <span>{tpl.displayName}</span>
                                  {tpl.previewFormula && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {tpl.previewFormula}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  {template && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">{template.description}</p>
                          <p>{template.rationale}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {featureCategoryConfig[template.category].label}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            template.estimatedImpact === 'high' && 'text-green-600 border-green-300',
                            template.estimatedImpact === 'medium' && 'text-blue-600 border-blue-300',
                            template.estimatedImpact === 'low' && 'text-gray-600'
                          )}
                        >
                          {template.estimatedImpact} impact
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {templateId && (
              <>
                <Separator />

                {/* Source Column */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Source Column</Label>
                  <Select 
                    value={column} 
                    onValueChange={setColumn} 
                    disabled={columns.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.columnName} value={col.columnName}>
                          <div className="flex items-center gap-2">
                            <span>{col.columnName}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {col.dataType}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Parameters */}
                {template && Object.keys(template.params).length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Parameters</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(template.params).map(([key, config]) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs">{config.label}</Label>
                          
                          {config.type === 'number' && (
                            <div className="space-y-2">
                              {config.min !== undefined && config.max !== undefined ? (
                                <>
                                  <Slider
                                    value={[Number(params[key] ?? config.default)]}
                                    min={config.min}
                                    max={config.max}
                                    step={config.step ?? 1}
                                    onValueChange={([value]) => handleParamChange(key, value)}
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{config.min}</span>
                                    <span className="font-mono font-medium text-foreground">
                                      {String(params[key] ?? config.default)}
                                    </span>
                                    <span>{config.max}</span>
                                  </div>
                                </>
                              ) : (
                                <Input
                                  type="number"
                                  value={String(params[key] ?? config.default)}
                                  onChange={(e) => handleParamChange(key, Number(e.target.value))}
                                />
                              )}
                            </div>
                          )}

                          {config.type === 'string' && (
                            <Input
                              value={String(params[key] ?? config.default)}
                              onChange={(e) => handleParamChange(key, e.target.value)}
                            />
                          )}

                          {config.type === 'boolean' && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={Boolean(params[key] ?? config.default)}
                                onCheckedChange={(checked) => handleParamChange(key, checked)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {params[key] ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          )}

                          {config.type === 'select' && config.options && (
                            <Select
                              value={String(params[key] ?? config.default)}
                              onValueChange={(value) => handleParamChange(key, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {config.options.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Feature Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Feature Name</Label>
                  <Input
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    placeholder={derivedName || 'Auto-generated from column and method'}
                  />
                  {column && template && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code className="bg-muted px-1 py-0.5 rounded">{column}</code>
                      <ArrowRight className="h-3 w-3" />
                      <code className="bg-muted px-1 py-0.5 rounded">{derivedName}</code>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (optional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={template?.description ?? 'What this feature represents'}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!template || !column}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Create Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
