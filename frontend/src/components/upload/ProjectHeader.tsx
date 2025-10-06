/**
 * ProjectHeader - Displays project information at the top of upload tab
 *
 * Features:
 * - Large colored icon from project
 * - Prominent project title
 * - Project description with proper overflow handling
 * - Visual hierarchy with size and spacing
 * - Responsive design
 *
 * Design Philosophy:
 * - Establishes context for the user
 * - Uses project branding (icon/color) for visual consistency
 * - Professional, clean aesthetic
 */

import * as LucideIcons from 'lucide-react';
import type { Project } from '@/types/project';
import { projectColorClasses } from '@/types/project';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    project.icon
  ] || LucideIcons.Folder;

  const colorClasses = projectColorClasses[project.color];

  // Truncate title if longer than 60 characters
  const shouldTruncateTitle = project.title.length > 60;
  const displayTitle = shouldTruncateTitle ? `${project.title.slice(0, 60)}...` : project.title;

  // Truncate description if longer than 200 characters
  const shouldTruncateDesc = project.description && project.description.length > 200;
  const displayDescription = shouldTruncateDesc
    ? `${project.description!.slice(0, 200)}...`
    : project.description;

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="px-8 py-6">
        <div className="flex items-center gap-4">
          {/* Project Icon - Large and prominent */}
          <div
            className={cn(
              'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 shadow-sm',
              colorClasses.bg,
              colorClasses.border
            )}
          >
            <IconComponent className={cn('h-8 w-8', colorClasses.text)} />
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0">
            {/* Project Title - Large and bold */}
            <div>
              {shouldTruncateTitle ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h1 className="text-3xl font-bold text-foreground tracking-tight cursor-help">
                        {displayTitle}
                      </h1>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-md">
                      <p className="text-sm">{project.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {displayTitle}
                </h1>
              )}
            </div>

            {/* Project Description - Only render if exists */}
            {project.description && (
              <div className="mt-2">
                {shouldTruncateDesc ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-base text-muted-foreground leading-relaxed cursor-help">
                          {displayDescription}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start" className="max-w-lg">
                        <p className="text-sm whitespace-pre-wrap">{project.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {displayDescription}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}