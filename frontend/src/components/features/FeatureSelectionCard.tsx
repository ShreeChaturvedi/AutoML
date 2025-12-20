import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { FeatureControl, FeatureSuggestion } from '@/types/featurePlan';
import { Trash2 } from 'lucide-react';

interface FeatureSelectionCardProps {
  suggestion: FeatureSuggestion & { enabled: boolean };
  active?: boolean;
  onToggle: (enabled: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onControlChange: (controlKey: string, value: unknown) => void;
  onFocus?: () => void;
  onRemove?: () => void;
}

export function FeatureSelectionCard({
  suggestion,
  active,
  onToggle,
  onNameChange,
  onDescriptionChange,
  onControlChange,
  onFocus,
  onRemove
}: FeatureSelectionCardProps) {
  return (
    <Card
      className={cn(
        'p-4 border transition-colors',
        active && 'ring-1 ring-primary/40',
        !suggestion.enabled && 'opacity-70'
      )}
      onClick={onFocus}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {suggestion.method}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {suggestion.impact} impact
            </Badge>
          </div>
          <Input
            value={suggestion.featureName}
            onChange={(event) => onNameChange(event.target.value)}
            className="h-8 text-sm"
          />
          <Input
            value={suggestion.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="h-8 text-xs"
            placeholder="Short description"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={suggestion.enabled}
            onCheckedChange={(checked) => onToggle(checked)}
            onClick={(event) => event.stopPropagation()}
          />
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {suggestion.controls.length > 0 && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {suggestion.controls.map((control) => (
            <ControlField
              key={control.key}
              control={control}
              onChange={(value) => onControlChange(control.key, value)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ControlField({
  control,
  onChange
}: {
  control: FeatureControl;
  onChange: (value: unknown) => void;
}) {
  switch (control.type) {
    case 'number': {
      return (
        <div className="space-y-1">
          <Label className="text-xs">{control.label}</Label>
          <Input
            type="number"
            value={String(control.value ?? '')}
            min={control.min}
            max={control.max}
            step={control.step}
            className="h-8 text-xs"
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </div>
      );
    }
    case 'boolean': {
      return (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">{control.label}</Label>
          <Switch
            checked={Boolean(control.value)}
            onCheckedChange={(value) => onChange(value)}
          />
        </div>
      );
    }
    case 'select':
    case 'column': {
      return (
        <div className="space-y-1">
          <Label className="text-xs">{control.label}</Label>
          <Select value={String(control.value ?? '')} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {control.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    case 'text': {
      return (
        <div className="space-y-1">
          <Label className="text-xs">{control.label}</Label>
          <Input
            value={String(control.value ?? '')}
            className="h-8 text-xs"
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
    }
    default:
      return null;
  }
}
