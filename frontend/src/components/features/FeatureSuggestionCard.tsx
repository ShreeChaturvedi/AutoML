import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { FeatureSuggestion } from '@/types/featurePlan';

interface FeatureSuggestionCardProps {
  suggestion: FeatureSuggestion;
  enabled: boolean;
  active?: boolean;
  onToggle: (enabled: boolean) => void;
  onFocus?: () => void;
}

const impactClasses: Record<string, string> = {
  high: 'border-emerald-500/50 text-emerald-600',
  medium: 'border-blue-500/40 text-blue-500',
  low: 'border-muted-foreground/40 text-muted-foreground'
};

export function FeatureSuggestionCard({
  suggestion,
  enabled,
  active,
  onToggle,
  onFocus
}: FeatureSuggestionCardProps) {
  return (
    <Card
      className={cn(
        'p-3 transition-colors border cursor-pointer',
        enabled ? 'bg-muted/40 border-primary/30' : 'hover:border-primary/20',
        active && 'ring-1 ring-primary/40'
      )}
      onClick={onFocus}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', impactClasses[suggestion.impact])}>
              {suggestion.impact}
            </Badge>
            <span className="text-sm font-semibold">{suggestion.displayName}</span>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
        </div>

        <Switch
          checked={enabled}
          onCheckedChange={(checked) => onToggle(checked)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Toggle ${suggestion.displayName}`}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{suggestion.sourceColumn}</span>
        {suggestion.secondaryColumn && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{suggestion.secondaryColumn}</span>
        )}
        {suggestion.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
