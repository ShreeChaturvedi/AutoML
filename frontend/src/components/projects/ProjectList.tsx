/**
 * ProjectList - List of all projects in the sidebar
 *
 * Features:
 * - Display all projects
 * - Create new project button
 * - Empty state when no projects
 */

import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectItem } from './ProjectItem';
import { ProjectDialog } from './ProjectDialog';

export function ProjectList() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const projects = useProjectStore((state) => state.projects);
  const isInitialized = useProjectStore((state) => state.isInitialized);
  const isLoading = useProjectStore((state) => state.isLoading);
  const error = useProjectStore((state) => state.error);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Projects
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">New project</span>
        </Button>
      </div>

      {/* Project List */}
      {!isInitialized && isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
          Loading projects...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-destructive">
          {error}
        </div>
      ) : projects.length > 0 ? (
        <div className="space-y-1">
          {projects.map((project) => (
            <ProjectItem key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground mb-3">No projects yet</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-2" />
            Create Project
          </Button>
        </div>
      )}

      {/* Create Project Dialog */}
      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
