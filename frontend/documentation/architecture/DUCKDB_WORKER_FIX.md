# DuckDB Worker Initialization Fix

**Date:** September 30, 2025  
**Issue:** Worker initialization failing with "Unexpected token 'export'" error  
**Status:** ✅ RESOLVED

## Root Cause

The DuckDB-WASM worker files (`duckdb-browser-mvp.worker.js`, `duckdb-browser-eh.worker.js`) are **pre-built as IIFE (Immediately Invoked Function Expression)** format, not ES modules. 

Failed approaches:
1. **jsDelivr CDN**: CORS policy blocked loading from external CDN
2. **`?url` imports**: Vite served source ES module files instead of pre-built IIFE bundles
3. **`new URL()` with `import.meta.url`**: Still served source files from node_modules
4. **`type: 'module'` in Worker constructor**: Workers expected classic IIFE format, not ES modules

## Final Solution

**Copy pre-built worker files to `public/` folder** and load them as static assets:

```bash
# Copy DuckDB bundles to public folder
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm public/
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm public/
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js public/
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js public/
```

```typescript
// Load from public folder (served at root / by Vite)
const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: '/duckdb-mvp.wasm',
    mainWorker: '/duckdb-browser-mvp.worker.js',
  },
  eh: {
    mainModule: '/duckdb-eh.wasm',
    mainWorker: '/duckdb-browser-eh.worker.js',
  },
};

const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
const worker = new Worker(bundle.mainWorker); // No type: 'module'
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
const conn = await db.connect(); // Critical: Create connection after instantiation
```

## Key Changes

### 1. Static Assets in Public Folder
- `public/duckdb-mvp.wasm` - MVP WASM module
- `public/duckdb-eh.wasm` - Exception handling WASM module  
- `public/duckdb-browser-mvp.worker.js` - MVP worker (IIFE)
- `public/duckdb-browser-eh.worker.js` - EH worker (IIFE)

### 2. Updated `duckdbClient.ts` Initialization
- Load bundles from `/` (public folder static assets)
- Remove `type: 'module'` from Worker constructor
- **Add connection creation**: `this.conn = await this.db.connect()`
- Set `isInitialized = true` after successful setup
- Simplified promise-based initialization

### 3. Class Structure
- Added `initPromise: Promise<void> | null` for proper async initialization
- Removed obsolete `isInitializing` flag
- Removed `waitForInitialization()` timeout polling method
- Cleanup on error: reset `db`, `conn`, and `initPromise` to null

## Why This Works

1. **Vite serves `public/` folder at root path** (`/`), no bundler processing
2. **Pre-built IIFE workers** are served as-is, not transformed to ES modules
3. **No CORS issues** - same-origin requests
4. **Browser loads correct format** - classic script IIFE, not ES module

## Files Changed

- ✅ `frontend/src/lib/duckdb/duckdbClient.ts` - Fixed initialization + connection creation
- ✅ `frontend/public/duckdb-*.wasm` - NEW: WASM modules (4 files)
- ✅ `frontend/public/duckdb-browser-*.worker.js` - NEW: Worker bundles (2 files)

## Testing Results

✅ DuckDB initialized successfully  
✅ Connection created  
✅ Tables loaded from CSV files  
✅ SQL queries execute correctly  
✅ Results show correct row counts and WHERE clause filtering  
✅ No CORS errors  
✅ No "Unexpected token 'export'" errors  

## Maintenance

**When updating `@duckdb/duckdb-wasm` version**, re-copy files to public folder:

```bash
cd frontend
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-{mvp,eh}.wasm public/
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-{mvp,eh}.worker.js public/
```
