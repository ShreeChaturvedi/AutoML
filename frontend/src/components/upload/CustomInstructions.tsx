/**
 * CustomInstructions - Project-specific instructions and context input
 *
 * Features:
 * - Large textarea for custom instructions
 * - Rich placeholder text explaining the purpose
 * - Character count indicator
 * - Auto-resize behavior
 * - Saves to project metadata
 * - Empty state with helpful guidance
 *
 * Design Philosophy:
 * - Allows users to provide domain-specific context
 * - This context will be used by RAG system for better suggestions
 * - Professional layout with clear labeling
 *
 * TODO: Backend integration
 * - Save instructions to project metadata
 * - Sync with backend API when available
 */

import { useState, useEffect } from 'react';
import { FileText, Info, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

interface CustomInstructionsProps {
  projectId: string;
}

export function CustomInstructions({ projectId }: CustomInstructionsProps) {
  const updateProject = useProjectStore((state) => state.updateProject);
  const project = useProjectStore((state) => state.getProjectById(projectId));

  // Get instructions from project metadata
  const initialInstructions = (project?.metadata?.customInstructions as string) || '';
  const [instructions, setInstructions] = useState(initialInstructions);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Character limits
  const minChars = 50;
  const maxChars = 5000;
  const charCount = instructions.length;
  const isOptimal = charCount >= minChars;

  // Auto-save after 2 seconds of no typing
  useEffect(() => {
    if (!hasChanges) return;

    const timeoutId = setTimeout(() => {
      // Save to project metadata
      updateProject(projectId, {
        metadata: {
          ...project?.metadata,
          customInstructions: instructions
        }
      });
      setHasChanges(false);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [instructions, hasChanges, projectId, updateProject, project?.metadata]);

  const handleChange = (value: string) => {
    if (value.length <= maxChars) {
      setInstructions(value);
      setHasChanges(true);
    }
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-semibold">Custom Instructions</CardTitle>
              <CardDescription className="text-xs">
                Help the AI understand your project better
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm font-mono font-normal">
            {charCount}/{maxChars}
          </Badge>
        </div>

        {/* Info Banner */}
        <div className="flex gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium text-foreground">Why provide instructions?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your instructions help our AI make smarter suggestions for feature engineering,
              model selection, and data preprocessing. Include domain knowledge, business goals,
              and any specific requirements or constraints.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-3 pt-0">
        <div className="flex-1 flex flex-col space-y-2">
          <Label htmlFor="custom-instructions" className="text-sm font-medium">
            Project Context & Instructions
          </Label>
          <Textarea
            id="custom-instructions"
            value={instructions}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`Example instructions:\n\n• This project analyzes satellite telemetry data to predict component failures\n• Focus on time-series patterns and anomaly detection\n• Prioritize model interpretability over raw accuracy\n• Key metrics: precision, recall, and early warning capability\n• Domain constraints: predictions must be made 48 hours in advance\n• Business context: each false negative costs approximately $2M in satellite repairs\n\nThe more context you provide, the better the AI can assist you with domain-aware suggestions.`}
            className={cn(
              'flex-1 resize-none font-mono text-sm leading-relaxed min-h-[300px] box-border border-2 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
              charCount === 0 && isFocused && 'border-primary',
              charCount > 0 && !isOptimal && 'border-yellow-500/50 focus:border-yellow-500'
            )}
          />
        </div>

        {/* Helper text */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {charCount === 0 && isFocused ? (
              <span>Start typing to add context...</span>
            ) : charCount === 0 ? (
              <span>&nbsp;</span>
            ) : !isOptimal ? (
              <span className="text-yellow-600 dark:text-yellow-500 font-medium">
                Add at least {minChars - charCount} more characters for better AI suggestions
              </span>
            ) : (
              <span className="text-green-600 dark:text-green-500 font-medium">
                Great! This provides good context for the AI
              </span>
            )}
          </div>
          {hasChanges && (
            <Badge variant="outline" className="text-xs">
              Saving...
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}