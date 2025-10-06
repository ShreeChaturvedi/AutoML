/**
 * PhaseList - Display unlocked phases for the active project
 *
 * Shows workflow phases that are unlocked for the current project.
 * Clicking a phase navigates to that phase in the workflow.
 */

import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { Phase } from '@/types/phase';
import { phaseConfig, getAllPhasesSorted } from '@/types/phase';
import { cn } from '@/lib/utils';

export function PhaseList() {
  const navigate = useNavigate();
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const projects = useProjectStore((state) => state.projects);

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : undefined;

  if (!activeProject) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a project to view phases
      </div>
    );
  }

  const unlockedPhases = activeProject.unlockedPhases;
  const currentPhase = activeProject.currentPhase;
  const completedPhases = activeProject.completedPhases;

  // Get phases sorted by workflow order, filter to unlocked only
  const sortedUnlockedPhases = getAllPhasesSorted().filter((phase) =>
    unlockedPhases.includes(phase)
  );

  const handlePhaseClick = (phase: Phase) => {
    if (activeProjectId) {
      // Navigate only - App.tsx will sync currentPhase from URL
      navigate(`/project/${activeProjectId}/${phase}`);
    }
  };

  return (
    <div className="space-y-1">
      <div className="px-2 py-1.5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Workflow
        </h2>
      </div>

      <div className="space-y-0.5">
        {sortedUnlockedPhases.map((phase) => {
          const config = phaseConfig[phase];
          const isActive = phase === currentPhase;
          const isCompleted = completedPhases.includes(phase);

          // Get icon component dynamically
          const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
            config.icon
          ];

          return (
            <button
              key={phase}
              onClick={() => handlePhaseClick(phase)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {/* Phase Icon */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md shrink-0',
                  isActive ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                {IconComponent && (
                  <IconComponent
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                )}
              </div>

              {/* Phase Label */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{config.label}</div>
              </div>

              {/* Completion Indicator */}
              {isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
