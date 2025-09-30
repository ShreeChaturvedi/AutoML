/**
 * ProjectItem - Individual project item in the sidebar
 *
 * Features:
 * - Expandable/collapsible project with workflow sections
 * - Icon with color background
 * - Project title
 * - Workflow sections (Data Viewer, Upload, Preprocessing, etc.)
 * - Right-click context menu (edit, delete)
 * - Click to expand/collapse, click section to open tab
 */

import { useState } from 'react';
import { MoreVertical, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';
import { useTabStore } from '@/stores/tabStore';
import type { Project } from '@/types/project';
import type { TabType } from '@/types/tab';
import { projectColorClasses } from '@/types/project';
import { tabTypeConfig } from '@/types/tab';
import { ProjectDialog } from './ProjectDialog';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface ProjectItemProps {
  project: Project;
}

// Workflow sections in order
const workflowSections: TabType[] = [
  'data-viewer',
  'upload',
  'preprocessing',
  'feature-engineering',
  'training',
  'experiments',
  'deployment',
  'chat'
];

export function ProjectItem({ project }: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const closeAllProjectTabs = useTabStore((state) => state.closeAllProjectTabs);
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const createTab = useTabStore((state) => state.createTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);

  const isActive = activeProjectId === project.id;
  const colorClasses = projectColorClasses[project.color];

  // Get icon component dynamically
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    project.icon
  ];

  const handleDelete = () => {
    // Close all tabs for this project
    closeAllProjectTabs(project.id);
    // Delete the project
    deleteProject(project.id);
  };

  const handleProjectClick = () => {
    setActiveProject(project.id);
    setIsExpanded(!isExpanded);
  };

  const handleSectionClick = (sectionType: TabType) => {
    // Set project as active
    setActiveProject(project.id);

    // Find existing tab for this section
    const existingTab = tabs.find(
      (tab) => tab.projectId === project.id && tab.type === sectionType
    );

    if (existingTab) {
      // Switch to existing tab
      setActiveTab(existingTab.id);
    } else {
      // Create new tab for this section
      createTab(project.id, sectionType);
    }
  };

  return (
    <>
      <div className="space-y-0.5">
        {/* Project Header */}
        <div
          className={cn(
            'group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50 text-foreground'
          )}
          onClick={handleProjectClick}
        >
          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}

          {/* Icon with colored background */}
          <div
            className={cn(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md',
              colorClasses.bg,
              colorClasses.text
            )}
          >
            {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
          </div>

          {/* Project title */}
          <span className="flex-1 truncate text-sm font-medium">{project.title}</span>

          {/* More options menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setIsEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Workflow Sections */}
        {isExpanded && isActive && (
          <div className="ml-4 space-y-0.5">
            {workflowSections.map((sectionType) => {
              const config = tabTypeConfig[sectionType];
              const SectionIcon = (LucideIcons as unknown as Record<
                string,
                React.ComponentType<{ className?: string }>
              >)[config.icon];

              // Check if this section has an active tab
              const sectionTab = tabs.find(
                (tab) => tab.projectId === project.id && tab.type === sectionType
              );
              const isSectionActive = sectionTab?.id === activeTabId;

              return (
                <div
                  key={sectionType}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors text-sm',
                    isSectionActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                  )}
                  onClick={() => handleSectionClick(sectionType)}
                >
                  {SectionIcon && <SectionIcon className="h-3.5 w-3.5" />}
                  <span className="text-xs">{config.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Project Dialog */}
      <ProjectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        project={project}
      />
    </>
  );
}