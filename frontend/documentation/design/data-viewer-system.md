# Data Viewer System Design

**Date:** 2025-09-30
**Status:** Implemented
**Decision Makers:** Development Team

## Overview

The Data Viewer tab provides a Tableau-style interface for querying and exploring datasets. This document outlines the design decisions, component architecture, and technical choices made for implementing an interactive data exploration experience.

## Design Philosophy

The data viewer follows the platform's "Control Panel" philosophy: users interact with data through polished UI components rather than editing raw code. The interface aims to:

1. **Minimize friction**: Quick access to common operations (search, download, pagination)
2. **Progressive disclosure**: Advanced features available but not overwhelming
3. **Professional aesthetics**: Clean, modern design appropriate for data scientists
4. **Responsive performance**: Handle large datasets gracefully with pagination and virtualization

## Component Architecture

### 1. QueryPanel Component
**Location:** `src/components/data/QueryPanel.tsx`

**Purpose:** Provides query input interface with dual-mode support (English/SQL)

**Key Features:**
- Mode toggle (English ↔ SQL)
- Dynamic input styling based on mode
- Default SQL template
- Execute button

**Design Decisions:**
- **Toggle Component:** Uses Radix UI Switch (via shadcn) for accessibility and smooth animations
- **Input Component:** Textarea for multi-line queries
- **Font Handling:**
  - English mode: Default sans-serif (Tailwind default)
  - SQL mode: Monospace font (`font-mono` class)

**Layout:**
```
┌─────────────────────────────┐
│  English [Toggle] SQL       │
│                             │
│  ┌─────────────────────┐   │
│  │ Query Input         │   │
│  │ (Multi-line)        │   │
│  └─────────────────────┘   │
│                             │
│         [Execute →]         │
└─────────────────────────────┘
```

### 2. Enhanced DataTable Component
**Location:** `src/components/data/DataTable.tsx` (updated)

**New Features:**
- **Pagination:** Rows per page selector (10, 25, 50, 100)
- **Search:** In-table filtering across all columns
- **Download:** Export visible data as CSV
- **Save:** Bookmark query results (placeholder for backend)

**Toolbar Layout:**
```
┌─────────────────────────────────────────┐
│ [Search: _____] [Download] [Save]       │
└─────────────────────────────────────────┘
```

**Footer Layout:**
```
┌─────────────────────────────────────────┐
│ Showing 1-25 of 1,234 rows              │
│ [← Prev] Page 1 of 50 [Next →]         │
│ Rows per page: [25 ▼]                  │
└─────────────────────────────────────────┘
```

### 3. QueryResultsPanel Component
**Location:** `src/components/data/QueryResultsPanel.tsx`

**Purpose:** Manages multiple query result artifacts with tabbed interface

**Features:**
- Tab creation for each query execution
- Tab naming (auto-generated or custom)
- Tab closing (with confirmation for unsaved)
- Active tab highlighting

**Layout:**
```
┌─────────────────────────────────────────┐
│ [Query 1] [Query 2] [Query 3 ✕]  [+ New]│
└─────────────────────────────────────────┘
│                                         │
│         Query Result Content            │
│                                         │
└─────────────────────────────────────────┘
```

## Typography System

### Monospace Font (Code)
**Usage:** SQL queries, data cells, file sizes, technical metadata
**CSS Class:** `font-mono`
**Font Stack:** Tailwind default mono stack
```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 
             "Liberation Mono", "Courier New", monospace;
```

**Applied to:**
- SQL mode query input
- Data table cells (not headers)
- Row/column counts
- File size displays
- Timestamps in ISO format

### Sans-serif Font (UI)
**Usage:** Headers, labels, buttons, English queries
**CSS Class:** Default (no explicit class needed)
**Font Stack:** Tailwind default sans stack
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Applied to:**
- Column headers
- Button labels
- Form labels
- English mode query input
- Navigation elements

### Font Weight Guidelines
- **Headers:** `font-medium` (500) or `font-semibold` (600)
- **Body text:** Default (400)
- **Emphasis:** `font-semibold` (600)
- **Code:** Default weight in monospace

## SQL Syntax Highlighting

### Decision: Monaco Editor vs. Alternatives

**Evaluated Options:**
1. **Monaco Editor** (VSCode's editor) - ⭐ **CHOSEN**
2. **CodeMirror 6**
3. **Prism.js** (syntax highlighting only, no editing)
4. **React-Syntax-Highlighter** (display only)

**Decision Matrix:**

| Feature | Monaco | CodeMirror 6 | Prism.js | React-SH |
|---------|--------|--------------|----------|----------|
| SQL Support | ✅ Built-in | ✅ Via extension | ✅ Yes | ✅ Yes |
| Auto-complete | ✅ Yes | ⚠️ Complex | ❌ No | ❌ No |
| Multi-line | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Bundle Size | ⚠️ Large (~4MB) | ✅ Moderate (~500KB) | ✅ Small (~50KB) | ✅ Small (~100KB) |
| Performance | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ Good |
| Theme Support | ✅ Extensive | ✅ Good | ✅ Good | ✅ Good |
| Accessibility | ✅ Excellent | ✅ Good | ❌ Limited | ❌ Limited |

**Why Monaco Editor?**

1. **Professional Experience:** Same editor as VSCode - familiar to all developers
2. **Rich Features:** IntelliSense, bracket matching, minimap, multi-cursor editing
3. **Accessibility:** ARIA-compliant, keyboard navigation, screen reader support
4. **Future Extensibility:** Can add custom SQL schema hints, autocomplete for table names
5. **Dark Mode:** First-class theme support matching our app's dark mode
6. **Maintenance:** Backed by Microsoft, actively maintained

**Trade-offs Accepted:**
- **Bundle Size:** 4MB is significant, but we'll use code-splitting to lazy-load
- **Load Time:** ~200ms initial load, acceptable for a professional tool
- **Complexity:** More configuration than simpler alternatives, but better UX

**Implementation:**
```bash
npm install @monaco-editor/react
```

**Configuration:**
```typescript
// Monaco configuration in QueryPanel
{
  language: 'sql',
  theme: 'vs-dark', // Match app theme
  minimap: { enabled: false },
  lineNumbers: 'on',
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  fontSize: 14,
  fontFamily: 'ui-monospace, ...' // Match font-mono
}
```

**Alternative Fallback:**
If Monaco proves too heavyweight in production, we have CodeMirror 6 as a proven fallback with similar features at 1/8th the bundle size.

## Pagination Strategy

### TanStack Table Built-in Pagination

**Why TanStack Table?**
- Already integrated in the project
- Performant for large datasets (virtualization support)
- Extensive API for filtering, sorting, pagination
- TypeScript-first design

**Pagination Features:**
1. **Rows per page selector:** Dropdown with options [10, 25, 50, 100]
2. **Page navigation:** Previous/Next buttons + page input
3. **Page info:** "Showing X-Y of Z rows"
4. **Keyboard shortcuts:** Arrow keys for navigation (future)

**Implementation:**
```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: {
    pagination: { pageIndex, pageSize }
  },
  onPaginationChange: setPagination
});
```

## Search/Filter Implementation

### Global Filter
**Approach:** Client-side filtering using TanStack Table's `getFilteredRowModel`

**Features:**
- Search across all columns
- Case-insensitive matching
- Debounced input (300ms) to avoid excessive re-renders
- Clear button in search input

**Trade-offs:**
- **Client-side:** Fast for datasets < 10,000 rows
- **Future:** Server-side filtering for larger datasets (requires backend API)

## Export Functionality

### CSV Export
**Library:** `papaparse` (already in project)

**Features:**
- Export currently visible data (respects filters/pagination)
- Filename: `query_result_TIMESTAMP.csv`
- UTF-8 encoding with BOM for Excel compatibility

**Future Enhancements:**
- Export formats: JSON, Excel (.xlsx), Parquet
- Export options: All rows vs. current page
- Column selection for export

## Query Artifacts (Tabs)

### Artifact Management
**Pattern:** Similar to browser tabs or Jupyter notebook cells

**State Management:**
```typescript
// In dataStore.ts
interface QueryArtifact {
  id: string;
  name: string; // "Query 1", "SELECT * FROM...", custom
  query: string;
  mode: 'english' | 'sql';
  result: DataPreview;
  timestamp: Date;
  isSaved: boolean;
}

artifacts: QueryArtifact[];
activeArtifactId: string | null;
```

**Tab Behavior:**
- **Auto-naming:** "Query 1", "Query 2", etc.
- **Rename:** Double-click tab to edit name
- **Close:** Confirm if unsaved changes
- **Reorder:** Drag-and-drop (using @dnd-kit)
- **Max tabs:** 10 (configurable)

## Layout Structure

### Split Panel Layout
```
┌─────────────────────────────────────────────────────┐
│ Tab Bar (Upload | Data Viewer | Preprocessing...)  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌───────────────────────────┐  │
│  │              │  │  [Q1] [Q2] [Q3] [+ New]   │  │
│  │ Query Panel  │  ├───────────────────────────┤  │
│  │              │  │                           │  │
│  │ [Toggle]     │  │      Query Results        │  │
│  │              │  │      (DataTable)          │  │
│  │ [Input]      │  │                           │  │
│  │              │  │  [Search] [⬇] [Save]     │  │
│  │ [Execute →]  │  │                           │  │
│  │              │  │  Table content...         │  │
│  │              │  │                           │  │
│  │              │  │  [Pagination Controls]    │  │
│  └──────────────┘  └───────────────────────────┘  │
│   (300px fixed)              (Flexible)           │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Desktop: Side-by-side panels
- Tablet (< 1024px): Stacked panels with collapse toggle
- Mobile (< 768px): Single column, collapsible query panel

## Keyboard Shortcuts

**Query Panel:**
- `Cmd/Ctrl + Enter`: Execute query
- `Cmd/Ctrl + L`: Clear query
- `Esc`: Blur input

**Table:**
- `Cmd/Ctrl + F`: Focus search
- `Cmd/Ctrl + D`: Download CSV
- `Arrow Left/Right`: Previous/Next page (when pagination focused)

**Tabs:**
- `Cmd/Ctrl + T`: New tab
- `Cmd/Ctrl + W`: Close current tab
- `Cmd/Ctrl + [1-9]`: Switch to tab N

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast:**
- All text meets 4.5:1 contrast ratio
- Interactive elements meet 3:1 contrast ratio

**Keyboard Navigation:**
- All features accessible via keyboard
- Focus indicators visible
- Logical tab order

**Screen Readers:**
- ARIA labels on all controls
- Table headers properly associated
- Live regions for dynamic updates

**Testing Tools:**
- axe DevTools for automated checks
- Manual keyboard-only testing
- VoiceOver/NVDA testing

## Performance Optimizations

### Virtualization
**For datasets > 1,000 rows:**
- Use TanStack Table's `@tanstack/react-virtual`
- Render only visible rows (viewport)
- Maintain scroll position on updates

### Debouncing
- Search input: 300ms debounce
- Pagination changes: Immediate (no debounce)

### Memoization
- Column definitions: `useMemo`
- Filtered data: `useMemo`
- Table instance: Automatic (TanStack Table)

### Code Splitting
- Monaco Editor: Lazy load on first SQL mode activation
- Large dependencies: Dynamic imports

## Future Enhancements

### Phase 2 (Backend Integration)
- [ ] Server-side pagination for large datasets
- [ ] Query history with persistence
- [ ] Saved query templates
- [ ] Share query results via URL

### Phase 3 (Advanced Features)
- [ ] Visual query builder (drag-and-drop)
- [ ] Query performance metrics (execution time, rows scanned)
- [ ] Query result caching
- [ ] Export to cloud storage (S3, GCS)

### Phase 4 (AI Features)
- [ ] Natural language to SQL translation (LLM)
- [ ] Query optimization suggestions
- [ ] Anomaly detection in results
- [ ] Auto-generated data insights

## References

- [TanStack Table Docs](https://tanstack.com/table/v8)
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

