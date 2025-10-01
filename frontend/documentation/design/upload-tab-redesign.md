# Upload Tab Redesign

**Date:** 2025-09-30
**Status:** Implemented
**Components:** `UploadArea`, `ProjectHeader`, `CustomInstructions`, `DataUploadPanel`, `FileCard`

## Overview

Complete redesign of the data upload tab to create a professional, polished interface that establishes project context and provides dual functionality for custom instructions and file uploads.

## Design Goals

1. **Establish Context**: Immediately show users what project they're working in
2. **Professional Aesthetic**: Clean, polished UI that looks production-ready
3. **Dual Functionality**: Allow users to provide context while uploading data
4. **Proper Overflow Handling**: Handle long names, descriptions, and file names gracefully
5. **Responsive Design**: Work well on different screen sizes

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Project Header (icon, title, description)          │
├─────────────────────┬───────────────────────────────┤
│  Custom Instructions│  Data Upload Panel            │
│  (Left Column)      │  (Right Column)               │
│                     │                               │
│  - Domain context   │  - Drag & drop area           │
│  - Instructions     │  - File cards                 │
│  - Business goals   │  - Proceed button             │
└─────────────────────┴───────────────────────────────┘
```

## Components

### 1. ProjectHeader

**Purpose:** Display project information at the top of the upload tab.

**Features:**
- Large (64x64px) colored icon using project's color scheme
- Prominent project title (text-3xl, bold)
- Normal-sized project description (text-base)
- Automatic truncation with tooltips for long content:
  - Title: 60 character limit
  - Description: 200 character limit
- Subtle backdrop blur and border for visual separation

**Visual Hierarchy:**
- Icon is the most prominent visual element (large, colored, rounded)
- Title is large and bold (3xl font size)
- Description is muted and normal-sized (base font size)

**Colors:**
- Uses project's assigned color from `projectColorClasses`
- Background: `bg-card/50` with `backdrop-blur-sm` for subtle depth
- Border: `border-b border-border` for clean separation

### 2. CustomInstructions (Left Column)

**Purpose:** Allow users to provide domain-specific context that will be used by the AI/RAG system.

**Features:**
- Large textarea (min-height: 300px) with monospace font
- Auto-save after 2 seconds of inactivity
- Character count indicator (max: 5000 characters)
- Minimum character recommendation (50 characters for optimal AI performance)
- Info banner explaining the purpose
- Visual feedback:
  - Yellow border when under 50 characters
  - Green indicator when >= 50 characters
  - "Saving..." badge during auto-save

**Design Philosophy:**
- Sparkles icon to indicate AI-powered feature
- Helpful placeholder text with example instructions
- Non-intrusive saving indicator
- Stores in project metadata (`customInstructions` key)

**Example Use Cases:**
- "This project analyzes satellite telemetry data to predict component failures"
- "Focus on time-series patterns and anomaly detection"
- "Prioritize model interpretability over raw accuracy"

### 3. DataUploadPanel (Right Column)

**Purpose:** Handle file uploads for both data files and context documents.

**Features:**
- Drag-and-drop area with visual feedback:
  - Scale animation (1.02) when dragging
  - Border color changes (primary)
  - Icon changes (FileStack → Upload with bounce animation)
- File type validation (CSV, JSON, Excel, PDF, Markdown, Word, etc.)
- Multiple file support
- File categorization:
  - Data files (CSV, JSON, Excel)
  - Context files (PDF, Markdown, Word)
- Badge indicators showing file counts
- "Continue" button to proceed to next step
- Scrollable file list for many files

**Visual Design:**
- Database icon to indicate data-centric functionality
- Rounded-xl border with hover states
- Professional spacing and padding
- Clear visual hierarchy (dropzone → file list → actions)

### 4. Enhanced FileCard

**Purpose:** Display uploaded file information with proper overflow handling.

**Improvements:**
- Truncated file names (40 character limit) with tooltips
- Type-specific colored icons:
  - CSV: Green (`bg-green-500/10`)
  - JSON: Blue (`bg-blue-500/10`)
  - Excel: Emerald (`bg-emerald-500/10`)
  - PDF: Red (`bg-red-500/10`)
  - Markdown: Cyan (`bg-cyan-500/10`)
  - Word: Indigo (`bg-indigo-500/10`)
  - Text: Slate (`bg-slate-500/10`)
  - Other: Gray (`bg-gray-500/10`)
- Hover actions (preview, remove) with tooltips
- Smooth transitions and animations:
  - Icon scales up (1.05) on hover
  - Border highlights on hover
  - Opacity transitions for actions
- Monospace font for file size (better alignment)

**Accessibility:**
- Tooltips for all actions
- Screen reader labels
- Keyboard accessible

## Responsive Behavior

### Large Screens (lg and above)
- Split-column layout (2 equal columns)
- Full width for each panel
- Optimal reading width maintained

### Small Screens (below lg)
- Stacked layout (single column)
- Custom Instructions on top
- Data Upload below
- Vertical scrolling

### Implementation
```css
grid-cols-1 lg:grid-cols-2
```

## Typography

### Project Header
- **Title:** `text-3xl font-bold tracking-tight`
- **Description:** `text-base text-muted-foreground leading-relaxed`

### Custom Instructions
- **Textarea:** `font-mono text-sm leading-relaxed`
- **Labels:** `text-sm font-medium`
- **Helper text:** `text-xs`

### Data Upload
- **Title:** `text-lg font-semibold`
- **Description:** `text-xs`
- **File names:** `text-sm font-medium`
- **File metadata:** `text-xs font-mono`

## Color System

All colors use semantic color variables from the design system:

- **Primary actions:** `text-primary`, `bg-primary`, `border-primary`
- **Muted text:** `text-muted-foreground`
- **Cards:** `bg-card`, `border-border`
- **Accent backgrounds:** `bg-primary/10`, `bg-primary/20`
- **Destructive actions:** `text-destructive`, `hover:bg-destructive/10`

## Spacing

- **Component padding:** `p-6` (24px)
- **Panel gaps:** `gap-6` (24px)
- **Internal spacing:** `space-y-3` (12px), `space-y-4` (16px)
- **Card padding:** `p-4` (16px)

## Icons

All icons from `lucide-react`:

- **Project Header:** Project-specific icon (e.g., `Database`, `Rocket`, `Zap`)
- **Custom Instructions:** `Sparkles` (AI-powered), `Info` (guidance)
- **Data Upload:** `Database`, `FileStack`, `Upload`
- **File types:** `Table` (CSV), `Braces` (JSON), `Sheet` (Excel), `FileText` (PDF/Text), `FileCode` (Markdown), `FileType` (Word)
- **Actions:** `Eye` (preview), `X` (remove), `Plus` (add), `ArrowRight` (continue)

## Animations & Transitions

### Hover States
- Duration: `200ms` (transition-all duration-200)
- Scale: `1.05` for icons
- Opacity: `0 → 100` for actions
- Border: Accent color highlight

### Drag States
- Scale: `1.02` for dropzone
- Background: Primary color with low opacity
- Icon: Bounce animation

### Auto-save
- Badge appears: "Saving..."
- Fades in/out smoothly
- Non-intrusive positioning

## File Type Support

### Data Files (for analysis)
- CSV (`.csv`)
- JSON (`.json`)
- Excel (`.xlsx`, `.xls`)

### Context Files (for RAG)
- PDF (`.pdf`)
- Markdown (`.md`)
- Word (`.docx`, `.doc`)
- Plain text (`.txt`)

**Note:** Images are NOT supported for upload (unlike previous version).

## State Management

### Project Store Updates
- Modified `updateProject` signature to accept `Partial<Project>` (excluding id, createdAt, updatedAt)
- Allows updating `metadata` field for storing custom instructions

### Data Flow
1. User types instructions → Local state updates
2. After 2s delay → Saved to project metadata
3. On file upload → Added to data store
4. On proceed → Navigates to data-viewer or preprocessing tab

## Edge Cases Handled

1. **Long project titles:** Truncated at 60 characters with tooltip
2. **Long descriptions:** Truncated at 200 characters with tooltip
3. **Long file names:** Truncated at 40 characters with tooltip
4. **No project selected:** Error state with guidance
5. **No files uploaded:** Disabled "Continue" button
6. **Many files:** Scrollable list with ScrollArea
7. **Empty instructions:** Helpful placeholder and guidance
8. **Character limits:** Visual feedback and character count

## Accessibility

- **Keyboard navigation:** All interactive elements are keyboard accessible
- **Screen readers:** Proper ARIA labels and semantic HTML
- **Tooltips:** Context for truncated content
- **Focus states:** Clear focus indicators
- **Color contrast:** WCAG AA compliant

## Future Enhancements

1. **Rich text editor** for custom instructions (formatting, links, etc.)
2. **Template library** for common instruction patterns
3. **File preview** in dropzone (drag-over preview)
4. **Bulk actions** for files (select all, remove selected)
5. **File organization** (folders, tags)
6. **Upload progress** indicators for large files
7. **Drag-to-reorder** files
8. **Cloud import** (Google Drive, Dropbox, S3)

## Technical Notes

### Type Safety
- All components use TypeScript with strict mode
- Proper type definitions for props and state
- No `any` types

### Performance
- Auto-save uses debouncing (2s delay)
- File parsing is async and non-blocking
- ScrollArea for large file lists

### Bundle Size
- Build successful: ~1.5MB (before code-splitting)
- Consider dynamic imports for PapaParse and other heavy libraries

## Testing Checklist

- [x] TypeScript build passes
- [x] No linting errors
- [x] Overflow handling works correctly
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Auto-save functionality verified
- [ ] File upload and parsing works
- [ ] Navigation to next step functions correctly
- [ ] Tooltips appear for truncated content
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility

## Files Modified/Created

### Created
- `frontend/src/components/upload/ProjectHeader.tsx`
- `frontend/src/components/upload/CustomInstructions.tsx`
- `frontend/src/components/upload/DataUploadPanel.tsx`

### Modified
- `frontend/src/components/upload/UploadArea.tsx` (complete rewrite)
- `frontend/src/components/upload/FileCard.tsx` (enhanced overflow handling)
- `frontend/src/components/upload/FilePreview.tsx` (removed image support)
- `frontend/src/stores/projectStore.ts` (updated type signature)
- `frontend/src/components/data/DataTable.tsx` (removed unused import)
- `frontend/src/components/layout/TabBar.tsx` (removed unused imports)

## References

- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card)
- [shadcn/ui Tooltip](https://ui.shadcn.com/docs/components/tooltip)
- [shadcn/ui Textarea](https://ui.shadcn.com/docs/components/textarea)
- [react-dropzone](https://react-dropzone.js.org/)
- [Lucide Icons](https://lucide.dev/)