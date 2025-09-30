/**
 * TabBar - Horizontal tab container with drag-and-drop reordering
 *
 * Features:
 * - Drag-and-drop tab reordering with @dnd-kit
 * - Tab close buttons
 * - Active tab highlighting
 * - New tab button
 * - Breadcrumb navigation below tabs
 *
 * TODO: Add keyboard shortcuts (Cmd+W to close tab, Cmd+T for new tab)
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { useTabStore } from '@/stores/tabStore';
import { useProjectStore } from '@/stores/projectStore';
import { tabTypeConfig } from '@/types/tab';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface SortableTabProps {
  id: string;
  title: string;
  icon: string;
  isActive: boolean;
  onClose: () => void;
  onClick: () => void;
}

function SortableTab({ id, title, icon, isActive, onClose, onClick }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // Get icon component dynamically
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon];

  // Handle click separately from drag
  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if not dragging
    if (!isDragging) {
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex h-10 cursor-pointer items-center gap-2 border-b-2 px-4 transition-colors',
        isActive
          ? 'border-primary bg-muted text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      onClick={handleClick}
    >
      {/* Drag handle (icon and title) */}
      <div {...attributes} {...listeners} className="flex items-center gap-2 flex-1">
        {IconComponent && <IconComponent className="h-4 w-4 flex-shrink-0" />}
        <span className="text-sm font-medium">{title}</span>
      </div>

      {/* Close button (not draggable) */}
      <Button
        variant="ghost"
        size="icon"
        className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function TabBar() {
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const getProjectById = useProjectStore((state) => state.getProjectById);
  const activeProject = activeProjectId ? getProjectById(activeProjectId) : undefined;

  // Get all tabs and filter locally to avoid creating new arrays in store
  const allTabs = useTabStore((state) => state.tabs);
  const tabs = activeProject
    ? allTabs.filter(t => t.projectId === activeProject.id).sort((a, b) => a.order - b.order)
    : [];

  const activeTabId = useTabStore((state) => state.activeTabId);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const reorderTabs = useTabStore((state) => state.reorderTabs);
  const createTab = useTabStore((state) => state.createTab);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);

      reorderTabs(oldIndex, newIndex);
    }
  };

  const handleNewTab = () => {
    if (activeProject) {
      // Create a new upload tab by default
      // TODO: Show a menu to select tab type
      createTab(activeProject.id, 'upload');
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="border-b border-border bg-card">
      {/* Tabs */}
      <div className="flex items-center overflow-x-auto scrollbar-thin">
        {tabs.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
              {tabs.map((tab) => {
                const config = tabTypeConfig[tab.type];
                return (
                  <SortableTab
                    key={tab.id}
                    id={tab.id}
                    title={tab.title}
                    icon={config.icon}
                    isActive={tab.id === activeTabId}
                    onClose={() => closeTab(tab.id)}
                    onClick={() => setActiveTab(tab.id)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            No tabs open. Create a new tab to get started.
          </div>
        )}

        {/* New Tab Button */}
        {activeProject && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-8 w-8 flex-shrink-0"
            onClick={handleNewTab}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">New tab</span>
          </Button>
        )}
      </div>

      {/* Breadcrumb */}
      {activeTab && (
        <div className="border-t border-border px-4 py-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/project/${activeProject?.id}`}>
                  {activeProject?.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{activeTab.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
    </div>
  );
}