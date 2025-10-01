/**
 * AppShell - Main application layout container
 *
 * Structure:
 * - Sidebar (left, collapsible) - shows phases for active project
 * - MainContent (center, contains phase content)
 *
 * Responsive behavior:
 * - Desktop: All panels visible
 * - Tablet: Sidebar auto-collapses, can be toggled
 * - Mobile: Full-screen content, sidebar as overlay
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { useProjectStore } from '@/stores/projectStore';
import { Sidebar } from './Sidebar';
import { ContinueButton } from './ContinueButton';
import { cn } from '@/lib/utils';
import { phaseConfig, getAllPhasesSorted, getNextPhase } from '@/types/phase';
import type { Phase } from '@/types/phase';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const getProjectById = useProjectStore((state) => state.getProjectById);

  const activeProject = activeProjectId ? getProjectById(activeProjectId) : undefined;

  // Get unlocked phases sorted by workflow order
  const unlockedPhases = activeProject
    ? getAllPhasesSorted().filter((phase) => activeProject.unlockedPhases.includes(phase))
    : [];

  // Parse phase from URL pathname (source of truth)
  // URL format: /project/:projectId/:phase
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPhaseFromURL = pathParts.length >= 3 ? (pathParts[2] as Phase) : undefined;
  const currentPhase = currentPhaseFromURL || activeProject?.currentPhase;

  const handlePhaseClick = (phase: Phase) => {
    if (activeProjectId) {
      // Navigate only - App.tsx will sync currentPhase from URL
      navigate(`/project/${activeProjectId}/${phase}`);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-border bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-0' : 'w-72'
        )}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar with Breadcrumbs */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 shrink-0"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            <Separator orientation="vertical" className="h-6 shrink-0" />

            {/* Phase Progression Breadcrumb */}
            {activeProject && unlockedPhases.length > 0 && (
              <Breadcrumb className="min-w-0">
                <BreadcrumbList className="flex-wrap">
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={`/project/${activeProjectId}/${unlockedPhases[0]}`}
                      className="text-sm hover:text-foreground max-w-[120px] truncate"
                      onClick={(e) => {
                        e.preventDefault();
                        const firstPhase = unlockedPhases[0];
                        handlePhaseClick(firstPhase);
                      }}
                    >
                      {activeProject.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  {/* Show all unlocked phases */}
                  {unlockedPhases.map((phase) => [
                    <BreadcrumbSeparator key={`sep-${phase}`}>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>,
                    <BreadcrumbItem key={phase}>
                      <BreadcrumbLink
                        href={`/project/${activeProjectId}/${phase}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePhaseClick(phase);
                        }}
                        className={cn(
                          'text-sm transition-colors',
                          phase === currentPhase
                            ? 'text-primary font-semibold pointer-events-none'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {phaseConfig[phase].label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ])}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Continue Button - only show if there's a next phase */}
            {activeProject && currentPhase && getNextPhase(currentPhase) && (
              <ContinueButton
                currentPhase={currentPhase}
                projectId={activeProjectId}
                className="h-8"
              />
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content (no TabBar) */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}