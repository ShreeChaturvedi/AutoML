/**
 * ModelSelector - Card-based model selection interface
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tags, 
  TrendingUp, 
  Circle, 
  Minimize2, 
  Code,
  TreeDeciduous,
  Zap,
  GitBranch,
  Check
} from 'lucide-react';
import { 
  modelCategoryConfig, 
  getTemplatesByCategory,
  type ModelCategory,
  type ModelTemplate
} from '@/types/training';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModelId?: string;
  onSelectModel: (model: ModelTemplate) => void;
}

const categoryIcons: Record<ModelCategory, typeof Tags> = {
  classification: Tags,
  regression: TrendingUp,
  clustering: Circle,
  dimensionality_reduction: Minimize2,
  custom: Code
};

const modelIcons: Record<string, typeof TreeDeciduous> = {
  TreeDeciduous: TreeDeciduous,
  Zap: Zap,
  GitBranch: GitBranch,
  TrendingUp: TrendingUp,
  Circle: Circle,
  Code: Code
};

export function ModelSelector({ selectedModelId, onSelectModel }: ModelSelectorProps) {
  const templatesByCategory = useMemo(() => getTemplatesByCategory(), []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Select Model</CardTitle>
        <CardDescription className="text-xs">
          Choose a model type to generate training code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="classification" className="w-full">
          <TabsList className="grid grid-cols-5 w-full mb-4">
            {(Object.keys(modelCategoryConfig) as ModelCategory[]).map(category => {
              const config = modelCategoryConfig[category];
              const Icon = categoryIcons[category];
              const count = templatesByCategory[category]?.length ?? 0;
              
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="gap-1 text-xs"
                  disabled={count === 0}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(modelCategoryConfig) as ModelCategory[]).map(category => {
            const templates = templatesByCategory[category] ?? [];
            
            return (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map(template => {
                    const isSelected = selectedModelId === template.id;
                    const IconComponent = modelIcons[template.icon] || Code;
                    
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          isSelected 
                            ? 'ring-2 ring-primary border-primary' 
                            : 'hover:border-primary/50'
                        )}
                        onClick={() => onSelectModel(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'rounded-lg p-2',
                                modelCategoryConfig[category].color
                              )}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{template.name}</p>
                                <p className="text-xs text-muted-foreground">{template.library}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="rounded-full bg-primary p-1">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {Object.keys(template.defaultParams).length} params
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

