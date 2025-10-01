# Sidebar Workflow Architecture

## Overview

The sidebar follows a project-centric, workflow-based architecture where each project contains expandable sections representing different stages of the ML pipeline.

## Structure

```
Sidebar
├── Logo/Brand (Top)
├── Projects Section (Scrollable)
│   ├── Project 1
│   │   ├── 📊 Data Viewer
│   │   ├── ⬆️  Upload
│   │   ├── 🔧 Preprocessing
│   │   ├── 🔨 Feature Engineering
│   │   ├── ▶️  Training
│   │   ├── 🧪 Experiments
│   │   ├── 🚀 Deployment
│   │   └── 💬 AI Assistant
│   ├── Project 2
│   │   └── [Same sections...]
│   └── + Create Project
└── User Profile (Bottom)
```

## Workflow Sections

Each project has 8 workflow sections in a fixed order:

### 1. Data Viewer (📊)
- **Purpose**: View and explore uploaded datasets
- **Tab Type**: `data-viewer`
- **Always Available**: This is the primary data visualization tab

### 2. Upload (⬆️)
- **Purpose**: Upload datasets and context documents
- **Tab Type**: `upload`
- **Accepted Files**: CSV, JSON, Excel, PDF, Markdown, Word, TXT

### 3. Preprocessing (🔧)
- **Purpose**: Clean, transform, and prepare data
- **Tab Type**: `preprocessing`
- **Features**: Data cleaning, missing value handling, encoding

### 4. Feature Engineering (🔨)
- **Purpose**: Create and select features
- **Tab Type**: `feature-engineering`
- **Features**: AI-assisted feature suggestions via RAG

### 5. Training (▶️)
- **Purpose**: Train and fine-tune models
- **Tab Type**: `training`
- **Features**: Algorithm selection, hyperparameter tuning

### 6. Experiments (🧪)
- **Purpose**: Track and compare experiments
- **Tab Type**: `experiments`
- **Features**: Metrics, visualizations, model comparison

### 7. Deployment (🚀)
- **Purpose**: Deploy models to production
- **Tab Type**: `deployment`
- **Features**: Containerization, API endpoints, monitoring

### 8. AI Assistant (💬)
- **Purpose**: Chat with policy-aware AI
- **Tab Type**: `chat`
- **Features**: RAG-based assistance, explanations, guidance

## Interaction Model

### Project Expansion
- Click project header to expand/collapse
- Only one project can be expanded at a time
- Expansion state is local (not persisted)

### Section Navigation
1. User clicks a workflow section (e.g., "Upload")
2. System checks if a tab for that section already exists
3. If exists: Switch to that tab
4. If not: Create new tab and switch to it
5. Navigate to project page if not already there

### Visual Feedback
- **Active Project**: Background highlight
- **Active Section**: Primary color highlight with bold text
- **Hover States**: Subtle background color change

## Implementation

### Component: `ProjectItem.tsx`

```typescript
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

const handleSectionClick = (sectionType: TabType) => {
  // 1. Set project as active
  setActiveProject(project.id);

  // 2. Find or create tab
  const existingTab = tabs.find(
    (tab) => tab.projectId === project.id && tab.type === sectionType
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    createTab(project.id, sectionType);
  }

  // 3. Navigate to project page
  window.location.href = `/project/${project.id}`;
};
```

### Tab Configuration: `tab.ts`

Each tab type has:
- `icon`: Lucide-react icon name
- `label`: Display name
- `description`: Tooltip/help text

## Design Decisions

### Why Fixed Order?
- **Logical Progression**: Follows the natural ML workflow
- **Consistency**: Same order across all projects
- **Predictability**: Users know where to find each section

### Why Expand/Collapse?
- **Space Efficiency**: Sidebar doesn't become cluttered
- **Focus**: Shows only relevant sections for active project
- **Flexibility**: Users can work with multiple projects without confusion

### Why Section-Based Navigation?
- **Context-Aware**: Each section opens the right tab type
- **Deduplication**: Prevents creating duplicate tabs
- **Intuitive**: Clear mental model of where you are in the workflow

## Future Enhancements

1. **Section Badges**: Show status badges (e.g., "3 datasets uploaded")
2. **Progress Indicators**: Show completion % for each section
3. **Conditional Visibility**: Hide sections not yet relevant (e.g., Deployment before Training)
4. **Keyboard Navigation**: Arrow keys to navigate sections
5. **Context Menus**: Right-click sections for additional options
