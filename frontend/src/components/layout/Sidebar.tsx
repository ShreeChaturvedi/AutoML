/**
 * Sidebar - Left navigation panel
 *
 * Contains:
 * - Logo/Brand at top (or current project info when project is active)
 * - ProjectList (when no project active) OR PhaseList (when project active)
 * - Back to Projects button (when project active)
 * - UserProfile (bottom section)
 *
 * Collapsible behavior managed by parent (AppShell)
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PhaseList } from './PhaseList';
import { ProjectList } from '@/components/projects/ProjectList';
import { UserProfile } from '@/components/projects/UserProfile';
import { useProjectStore } from '@/stores/projectStore';
import { projectColorClasses } from '@/types/project';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const projects = useProjectStore((state) => state.projects);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : undefined;

  if (collapsed) return null;

  const handleBackToProjects = () => {
    setActiveProject(null);
    navigate('/');
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Current Project Header */}
      <div className="flex h-14 items-center justify-between px-4">
        {activeProject ? (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Project Icon */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md shrink-0',
                  projectColorClasses[activeProject.color].bg
                )}
              >
                {(() => {
                  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
                    activeProject.icon
                  ];
                  return IconComponent ? (
                    <IconComponent
                      className={cn('h-4 w-4', projectColorClasses[activeProject.color].text)}
                    />
                  ) : null;
                })()}
              </div>

              {/* Project Title */}
              <span className="text-sm font-semibold text-foreground truncate">
                {activeProject.title}
              </span>
            </div>

            {/* Back button - icon only */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleBackToProjects}
              title="Back to Projects"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">AI</span>
            </div>
            <span className="text-sm font-semibold text-foreground">AutoML Toolchain</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Main Content Section */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="p-4">
            {activeProject ? (
              /* Show phases when project is active */
              <PhaseList />
            ) : (
              /* Show project list when no project is active */
              <ProjectList />
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <UserProfile />
      </div>
    </div>
  );
}
