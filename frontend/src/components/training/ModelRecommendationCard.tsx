import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelRecommendation } from '@/types/modelPlan';

interface ModelRecommendationCardProps {
  recommendation: ModelRecommendation;
  selected: boolean;
  onSelect: () => void;
}

export function ModelRecommendationCard({
  recommendation,
  selected,
  onSelect
}: ModelRecommendationCardProps) {
  const { template } = recommendation;

  return (
    <Card
      className={cn(
        'cursor-pointer border p-3 transition-colors',
        selected ? 'border-foreground/40 bg-muted/40' : 'hover:border-foreground/30'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{template.name}</p>
          <p className="text-xs text-muted-foreground">{template.description}</p>
        </div>
        {selected && (
          <span className="rounded-full border border-foreground/30 p-1">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{recommendation.rationale}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="text-[10px]">
          {template.library}
        </Badge>
        {template.metrics.slice(0, 3).map((metric) => (
          <Badge key={metric} variant="secondary" className="text-[10px]">
            {metric}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
