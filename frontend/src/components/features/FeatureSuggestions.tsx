/**
 * FeatureSuggestions - AI-powered feature suggestions based on column analysis
 */

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Maximize2, 
  Hash, 
  Calendar,
  GitMerge,
  Type,
  Layers,
  ChevronRight
} from 'lucide-react';
import type { ColumnStatistics } from '@/types/file';
import { 
  getSuggestedTemplates,
  featureCategoryConfig,
  type FeatureCategory,
  type FeatureTemplate
} from '@/types/feature';
import { cn } from '@/lib/utils';

interface FeatureSuggestionsProps {
  columns: ColumnStatistics[];
  onAddFeature: (templateId: string, column: string) => void;
}

const categoryIcons: Record<FeatureCategory, typeof TrendingUp> = {
  numeric_transform: TrendingUp,
  scaling: Maximize2,
  encoding: Hash,
  datetime: Calendar,
  interaction: GitMerge,
  text: Type,
  aggregation: Layers
};

const impactColors: Record<string, string> = {
  high: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

interface Suggestion {
  column: ColumnStatistics;
  template: FeatureTemplate;
}

export function FeatureSuggestions({ columns, onAddFeature }: FeatureSuggestionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | FeatureCategory>('all');

  // Generate smart suggestions based on column analysis
  const categorySuggestions = useMemo(() => {
    const byCategory: Map<FeatureCategory, Suggestion[]> = new Map();

    // Initialize category map
    for (const cat of Object.keys(featureCategoryConfig) as FeatureCategory[]) {
      byCategory.set(cat, []);
    }

    columns.forEach((col) => {
      const templates = getSuggestedTemplates(col);
      const suggestions = templates.map(t => ({ column: col, template: t }));
      
      suggestions.forEach(s => {
        byCategory.get(s.template.category)?.push(s);
      });
    });

    return byCategory;
  }, [columns]);

  // Get suggestions for current view
  const displaySuggestions = useMemo(() => {
    if (selectedCategory === 'all') {
      // Show top suggestions (high impact first)
      const all: Suggestion[] = [];
      categorySuggestions.forEach((suggestions) => {
        all.push(...suggestions);
      });
      
      // Sort by impact and deduplicate
      return all
        .sort((a, b) => {
          const impactOrder = { high: 0, medium: 1, low: 2 };
          return impactOrder[a.template.estimatedImpact] - impactOrder[b.template.estimatedImpact];
        })
        .slice(0, 20); // Limit to top 20
    }

    return categorySuggestions.get(selectedCategory) ?? [];
  }, [selectedCategory, categorySuggestions]);

  if (columns.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          Upload a dataset to see AI-powered feature suggestions
        </p>
      </div>
    );
  }

  if (displaySuggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No suggestions for this category. Try selecting a different one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Smart Suggestions
        </h3>
        <Badge variant="secondary" className="text-xs">
          {displaySuggestions.length} ideas
        </Badge>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={() => setSelectedCategory('all')}
        >
          All
        </Badge>
        {(Object.keys(featureCategoryConfig) as FeatureCategory[]).map(cat => {
          const count = categorySuggestions.get(cat)?.length ?? 0;
          if (count === 0) return null;
          
          const Icon = categoryIcons[cat];
          return (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer text-xs gap-1"
              onClick={() => setSelectedCategory(cat)}
            >
              <Icon className="h-3 w-3" />
              {count}
            </Badge>
          );
        })}
      </div>

      {/* Suggestions list */}
      <ScrollArea className="h-[380px]">
        <div className="space-y-2 pr-2">
          {displaySuggestions.map((sugg, idx) => {
            const Icon = categoryIcons[sugg.template.category];
            
            return (
              <Card
                key={`${sugg.template.id}-${sugg.column.columnName}-${idx}`}
                className={cn(
                  'p-3 cursor-pointer border transition-all duration-200',
                  'hover:border-primary/40 hover:shadow-sm hover:bg-accent/50',
                  'group'
                )}
                onClick={() => onAddFeature(sugg.template.id, sugg.column.columnName)}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-1.5 shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {sugg.template.displayName}
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant="secondary" 
                            className={cn('text-[10px] px-1.5 py-0', impactColors[sugg.template.estimatedImpact])}
                          >
                            {sugg.template.estimatedImpact}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{sugg.template.rationale}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">
                        {sugg.column.columnName}
                      </code>
                      <ArrowRight className="h-3 w-3" />
                      <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono truncate">
                        {sugg.column.columnName}_{sugg.template.method}
                      </code>
                    </div>
                    
                    {sugg.template.previewFormula && (
                      <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                        {sugg.template.previewFormula}
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
