/**
 * Tab type definitions for workspace management
 *
 * Tabs represent different stages/views within a project:
 * - Data upload
 * - Data preprocessing
 * - Feature engineering
 * - Model training
 * - Experiment tracking
 * - Deployment
 */

export type TabType =
  | 'data-viewer' // Data visualization and preview (always first tab)
  | 'upload'
  | 'preprocessing'
  | 'feature-engineering'
  | 'training'
  | 'experiments'
  | 'deployment'
  | 'chat'; // AI assistant chat

export interface Tab {
  id: string;
  projectId: string;
  type: TabType;
  title: string;
  order: number; // For drag-drop ordering
  createdAt: Date;
  metadata?: Record<string, unknown>; // Tab-specific state/data
}

/**
 * Breadcrumb stage for showing current pipeline position
 */
export interface BreadcrumbStage {
  label: string;
  path: string;
  isActive: boolean;
}

/**
 * Tab configuration for each type
 * Defines the icon, label, and description
 */
export const tabTypeConfig: Record<TabType, {
  icon: string; // lucide-react icon name
  label: string;
  description: string;
}> = {
  'data-viewer': {
    icon: 'Table',
    label: 'Data Viewer',
    description: 'View and explore your datasets'
  },
  upload: {
    icon: 'Upload',
    label: 'Data Upload',
    description: 'Upload and manage datasets'
  },
  preprocessing: {
    icon: 'Workflow',
    label: 'Preprocessing',
    description: 'Clean and transform data'
  },
  'feature-engineering': {
    icon: 'Wrench',
    label: 'Feature Engineering',
    description: 'Create and select features'
  },
  training: {
    icon: 'Play',
    label: 'Model Training',
    description: 'Train and fine-tune models'
  },
  experiments: {
    icon: 'FlaskConical',
    label: 'Experiments',
    description: 'Track and compare experiments'
  },
  deployment: {
    icon: 'Rocket',
    label: 'Deployment',
    description: 'Deploy models to production'
  },
  chat: {
    icon: 'MessageSquare',
    label: 'AI Assistant',
    description: 'Chat with policy-aware AI'
  }
};