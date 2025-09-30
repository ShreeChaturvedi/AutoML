/**
 * AppShell - Main application layout container
 *
 * Structure:
 * - Sidebar (left, collapsible)
 * - MainContent (center, contains TabBar + active tab content)
 * - DataExplorer (right, collapsible)
 *
 * Responsive behavior:
 * - Desktop: All panels visible
 * - Tablet: Sidebar auto-collapses, can be toggled
 * - Mobile: Full-screen content, sidebar as overlay
 */

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-border bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-0' : 'w-64'
        )}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <h1 className="text-sm font-semibold text-foreground">
              AI-Augmented AutoML Toolchain
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* TabBar and Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TabBar />

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}