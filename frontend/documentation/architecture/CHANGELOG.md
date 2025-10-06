# Frontend Changelog

## 2025-09-30 - DuckDB Integration (SQL Query Engine) ✅ COMPLETE

### 🎉 Major Feature: Real SQL Execution

**Implemented DuckDB-WASM as the client-side query engine** for the Data Viewer phase. Users can now execute real SQL queries against uploaded CSV datasets with accurate results and proper filtering.

#### What Changed
- ✅ Created `DuckDBService` singleton (`lib/duckdb/duckdbClient.ts` - 600+ lines)
- ✅ Automatic CSV table registration on file upload
- ✅ Real SQL query execution with Arrow IPC result streaming
- ✅ Query result conversion to `DataPreview` format
- ✅ Error handling with user-friendly messages
- ✅ Query timeout protection (30 seconds)
- ✅ Lazy WASM initialization (loads on first query)
- ✅ Connection management (create after instantiation)
- ✅ Static asset loading from public folder (WASM + workers)

#### Components Updated
- **DataViewerTab.tsx**: Replaced mock query handler with DuckDB service
- **DataUploadPanel.tsx**: Automatically loads CSVs into DuckDB tables
- **vite.config.ts**: Added WASM/worker configuration
- **public/**: Added 4 DuckDB bundle files (WASM modules + worker scripts)

#### Worker Initialization Fix
After multiple debugging iterations, final solution:
1. Copy pre-built IIFE worker bundles to `public/` folder
2. Load from root path (`/duckdb-browser-eh.worker.js`)
3. Create connection after DB instantiation
4. No `type: 'module'` in Worker constructor (workers are IIFE, not ES modules)

**Why other approaches failed:**
- jsDelivr CDN → CORS errors
- `?url` imports → Vite served ES module source files instead of IIFE bundles
- `new URL()` with `import.meta.url` → Same issue as `?url`

#### Performance
- First query: ~1-2s (WASM initialization)
- Subsequent queries: <100ms (small datasets)
- Supports datasets up to 50MB (client-side)

#### Documentation
- ✅ `ADR-002-duckdb-wasm-query-engine.md` - Architecture decision
- ✅ `DUCKDB_WORKER_FIX.md` - Worker initialization solution
- ✅ `DUCKDB_FINAL_IMPLEMENTATION.md` - Complete implementation summary
- ✅ `DUCKDB_CORS_FIX.md` - Marked as outdated (attempted fix)
- ✅ `lib/duckdb/README.md` - Developer guide

#### Testing Results
- ✅ CSV upload and table loading works
- ✅ SQL queries execute correctly
- ✅ WHERE clauses filter properly
- ✅ Row counts accurate
- ✅ Column types detected
- ✅ No CORS errors
- ✅ No worker initialization errors
- Updated `query-engine-duckdb.md` architecture doc
- Added `DUCKDB_IMPLEMENTATION_SUMMARY.md`

#### Known Limitations
- Client-side only (browser memory limits)
- No query persistence across sessions
- English→SQL translation not yet implemented

**See:** `frontend/documentation/architecture/DUCKDB_IMPLEMENTATION_SUMMARY.md` for full details.

---

## 2025-09-30 - Major Bug Fixes and UI Improvements

### Fixed Issues

#### 1. Theme System ✅
- **Light Mode**: Fixed CSS variables for proper light mode support
- **Color Contrast**: Updated project colors to work in both light and dark modes using conditional Tailwind classes
- **Theme Toggle**: Already implemented as a button (not dropdown) with sun/moon icon

#### 2. Project Dialog ✅
- **Icon Placement**: Moved icon preview to the left of the title input (inline)
- **Color Picker**: Fixed all colors to display properly with explicit color classes
- **Field Alignment**: Ensured all fields take full width of the dialog
- **Focus Outlines**: Removed unwanted focus outlines from dialog inputs

#### 3. User Profile ✅
- **Simplified Design**: User profile is now a simple display (no dropdown)
- Shows avatar, name, and email only
- Future: Will integrate with authentication system

#### 4. File Upload ✅
- **Removed Image Support**: Now only accepts data files (CSV, JSON, Excel) and context documents (PDF, Markdown, Word, TXT)
- **Updated File Types**: Properly categorized file types and icons
- **Clear Messaging**: Updated upload area description

#### 5. Data Viewer ✅
- **CSV Row Count**: Fixed to show accurate total rows (not just preview count)
- **Table Footer**: Redesigned with Colab-style footer showing "N rows × M columns"
- **Removed Nested Cards**: Eliminated extra card wrapper to reduce border nesting
- **Preview Indicator**: Shows "Showing first N rows" when applicable

#### 6. Sidebar Structure ✅
- **Workflow Sections**: Each project now has expandable workflow sections
  - Data Viewer (always first)
  - Upload
  - Preprocessing
  - Feature Engineering
  - Training
  - Experiments
  - Deployment
  - AI Assistant (Chat)
- **Click to Navigate**: Clicking a section opens the corresponding tab
- **Visual Feedback**: Active section is highlighted

#### 7. Tab Management ✅
- **Tab Switching**: Verified tabs can be switched by clicking
- **Tab Closing**: Verified tabs can be closed via close button
- **Drag & Drop**: Tab reordering works via drag-and-drop

### Technical Changes

#### Files Modified
1. `src/types/project.ts` - Updated color classes for light/dark mode
2. `src/components/projects/ProjectDialog.tsx` - Redesigned layout and color picker
3. `src/components/projects/ProjectItem.tsx` - Added navigation logic for sections
4. `src/components/upload/UploadArea.tsx` - Removed image support
5. `src/types/file.ts` - Updated file types and icons
6. `src/components/data/DataTable.tsx` - Redesigned footer
7. `src/components/data/DataViewerTab.tsx` - Removed card wrapper
8. `src/index.css` - Fixed light mode variables, removed focus outlines

#### Key Improvements
- **Better Color System**: All colors now work in both themes
- **Cleaner UI**: Removed unnecessary borders and outlines
- **Better UX**: Workflow sections make navigation intuitive
- **Accurate Data Display**: CSV row counts are now correct

### Architecture Notes

#### Project-Centric Workflow
The sidebar now follows a hierarchical structure:
```
Projects
└── Project A
    ├── 📊 Data Viewer
    ├── ⬆️  Upload
    ├── 🔧 Preprocessing
    ├── 🔨 Feature Engineering
    ├── ▶️  Training
    ├── 🧪 Experiments
    ├── 🚀 Deployment
    └── 💬 AI Assistant
```

Each workflow section opens a corresponding tab in the main content area.

#### Tab System
- Tabs are project-scoped (each project has its own tabs)
- Tabs can be reordered via drag-and-drop
- Tabs persist in localStorage
- Only tabs for the active project are shown

#### Data Flow
1. User uploads data in "Upload" section
2. Data is parsed and stored in dataStore
3. Clicking "Proceed" creates/switches to "Data Viewer" tab
4. Data Viewer shows the full dataset with accurate row/column counts

### Future Improvements
- [ ] Add keyboard shortcuts (Cmd+W to close tab, Cmd+T for new tab)
- [ ] Add tab context menu (right-click on tab)
- [ ] Add project-level settings
- [ ] Integrate user authentication
- [ ] Add data statistics panel (mean, median, std, etc.)
