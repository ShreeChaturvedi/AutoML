# Frontend Folder Structure

## Overview

The frontend follows a feature-based folder structure with clear separation of concerns.

```
frontend/
├── documentation/              # Project documentation
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── design/                # Design system documentation
│   ├── architecture/          # Architecture diagrams and docs
│   └── api/                   # API documentation
│
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components (button, dialog, etc.)
│   │   ├── layout/           # Layout components (AppShell, Sidebar, etc.)
│   │   ├── projects/         # Project management components
│   │   ├── upload/           # File upload components
│   │   └── data/             # Data preview and table components
│   │
│   ├── stores/               # Zustand state stores
│   │   ├── projectStore.ts   # Project CRUD and selection
│   │   ├── tabStore.ts       # Workspace tab management
│   │   └── dataStore.ts      # File and data state
│   │
│   ├── types/                # TypeScript type definitions
│   │   ├── project.ts        # Project types and utilities
│   │   ├── tab.ts            # Tab types and configurations
│   │   └── file.ts           # File and data types
│   │
│   ├── hooks/                # Custom React hooks
│   │
│   ├── lib/                  # Utility functions
│   │   └── utils.ts          # cn() and other helpers
│   │
│   ├── App.tsx               # Main app component with routing
│   ├── main.tsx              # Entry point with providers
│   └── index.css             # Global styles and Tailwind directives
│
├── index.html                # HTML entry point
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── tsconfig.json             # TypeScript configuration
├── components.json           # shadcn/ui configuration
└── package.json              # Dependencies and scripts
```

## Component Organization

### UI Components (`src/components/ui/`)
- **Purpose**: Reusable, unstyled primitive components from shadcn/ui
- **Source**: Copied from shadcn/ui registry (not installed via npm)
- **Examples**: `button.tsx`, `dialog.tsx`, `card.tsx`, `table.tsx`, `switch.tsx`, `tabs.tsx`
- **Guidelines**:
  - Do not modify these directly (copy and create variants instead)
  - Update manually when shadcn/ui releases new versions
  - All components built on Radix UI primitives for accessibility

### Layout Components (`src/components/layout/`)
- **AppShell.tsx**: Main application layout container
  - Manages sidebar, main content, and data explorer panels
  - Handles collapse/expand state for panels
- **Sidebar.tsx**: Left navigation panel with projects and user profile
- **TabBar.tsx**: Horizontal tab bar with drag-drop reordering
- **DataExplorer.tsx**: Right panel for data preview and statistics

### Feature Components
- **projects/**: Project management UI (list, item, dialog, user profile)
- **upload/**: File upload area, file cards, file preview
- **data/**: Data exploration and query interface
  - `DataTable.tsx`: Enhanced table with pagination, search, export (TanStack Table)
  - `DataStats.tsx`: Dataset statistics and column info
  - `DataViewerTab.tsx`: Main data viewer orchestration
  - `QueryPanel.tsx`: Query builder with English/SQL toggle and Monaco Editor
  - `QueryResultsPanel.tsx`: Tabbed interface for query artifacts

## State Management

### Store Organization
Each store is a separate Zustand slice with clear responsibilities:

1. **projectStore.ts**
   - Project CRUD operations
   - Active project selection
   - localStorage persistence

2. **tabStore.ts**
   - Tab creation, deletion, reordering
   - Active tab selection
   - Tab state persistence

3. **dataStore.ts**
   - File upload state
   - Data preview (rows, columns, statistics)
   - Processing state
   - Query artifacts management (query results as tabs)
   - Active artifact selection

**Why separate stores?**
- Clear separation of concerns
- Easier to test and maintain
- Prevents unnecessary re-renders (components only subscribe to what they need)

## Type Definitions

### Type Organization (`src/types/`)

**project.ts**
- `Project`: Full project object with metadata
- `ProjectFormData`: Form input type
- `ProjectColor`: Predefined color palette
- `projectColorClasses`: Tailwind classes for each color

**tab.ts**
- `Tab`: Tab object with type and metadata
- `TabType`: Union type of all tab types
- `BreadcrumbStage`: Breadcrumb navigation
- `tabTypeConfig`: Icon and label for each tab type

**file.ts**
- `UploadedFile`: File with metadata
- `FileType`: Union type of supported file types
- `DataPreview`: Preview data structure
- `ColumnStatistics`: Column-level statistics
- `QueryMode`: 'english' | 'sql' for query builder
- `QueryArtifact`: Saved query result with metadata
- Helper functions: `getFileIcon()`, `formatFileSize()`, `getFileType()`

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `AppShell.tsx`, `ProjectDialog.tsx`)
- **Stores**: camelCase with 'Store' suffix (e.g., `projectStore.ts`)
- **Types**: camelCase (e.g., `project.ts`, `tab.ts`)
- **Utilities**: camelCase (e.g., `utils.ts`)

### Components
- **Prefix with feature**: `ProjectDialog`, `ProjectItem`, `ProjectList`
- **Descriptive names**: `UploadArea`, `FileCard`, `DataTable`
- **Avoid generic names**: Use `ProjectList` not `List`

### Functions
- **Actions**: Verb-first (e.g., `createProject`, `deleteFile`, `setActiveTab`)
- **Getters**: Get-prefix (e.g., `getActiveProject`, `getFilesByProject`)
- **Handlers**: Handle-prefix (e.g., `handleDelete`, `handleSubmit`)

## Import Aliases

Configured in `tsconfig.json` and `vite.config.ts`:

```typescript
@/components  → src/components
@/stores      → src/stores
@/types       → src/types
@/lib         → src/lib
@/hooks       → src/hooks
```

**Usage:**
```typescript
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types/project';
import { cn } from '@/lib/utils';
```

## File Ownership

- **UI components** (`src/components/ui/`): Owned by shadcn/ui, update manually
- **Feature components**: Owned by us, modify as needed
- **Stores**: Owned by us
- **Types**: Owned by us
- **Documentation**: Owned by us, keep updated

## Recently Added

### Data Viewer Enhancement (2025-09-30)
Added comprehensive query interface with Tableau-style data exploration:

**New Components:**
- `QueryPanel.tsx`: Dual-mode query builder (English/SQL) with Monaco Editor
- `QueryResultsPanel.tsx`: Tabbed interface for managing query artifacts
- Enhanced `DataTable.tsx`: Added pagination, search, CSV export

**New UI Components:**
- `switch.tsx`: Toggle component (Radix UI Switch)
- `tabs.tsx`: Tabbed interface component (Radix UI Tabs)

**Type Extensions:**
- `QueryMode`: 'english' | 'sql'
- `QueryArtifact`: Query result metadata

**Store Extensions:**
- Query artifacts management in `dataStore.ts`
- Artifact CRUD operations
- Active artifact tracking

**Dependencies Added:**
- `@monaco-editor/react`: SQL syntax highlighting and code editing
- `@radix-ui/react-switch`: Accessible toggle component
- `@radix-ui/react-tabs`: Accessible tabs component

**Documentation Added:**
- `data-viewer-system.md`: Complete design system for data viewer
- `typography.md`: Typography guidelines and font usage

## Future Expansion

As the project grows, consider:
- **services/**: API client functions (when backend is integrated)
- **contexts/**: React contexts (auth, settings, etc.)
- **utils/**: More utility functions (validation, formatting, etc.)
- **constants/**: Application constants (API URLs, config values, etc.)
- **assets/**: Images, fonts, and other static assets
- **tests/**: Unit and integration tests for components