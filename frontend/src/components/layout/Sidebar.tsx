/**
 * Sidebar - Left navigation panel
 *
 * Contains:
 * - Logo/Brand at top
 * - ProjectList (middle section)
 * - UserProfile (bottom section)
 *
 * Collapsible behavior managed by parent (AppShell)
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ProjectList } from '@/components/projects/ProjectList';
import { UserProfile } from '@/components/projects/UserProfile';

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  if (collapsed) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Logo/Brand */}
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">AI</span>
          </div>
          <span className="text-sm font-semibold text-foreground">AutoML</span>
        </div>
      </div>

      <Separator />

      {/* Projects Section */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <ProjectList />
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <UserProfile />
      </div>
    </div>
  );
}