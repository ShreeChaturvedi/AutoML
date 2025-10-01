# DuckDB CORS Issue Fix

> **⚠️ OUTDATED DOCUMENT**  
> This document describes an attempted fix that didn't work.  
> **See [DUCKDB_WORKER_FIX.md](./DUCKDB_WORKER_FIX.md) for the actual working solution.**

## Problem

When initializing DuckDB-WASM, you may encounter this error:

```
SecurityError: Failed to construct 'Worker': Script at 
'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/dist/duckdb-browser-eh.worker.js' 
cannot be accessed from origin 'http://localhost:5173'.
```

## Root Cause

This occurs because:
1. DuckDB-WASM tries to load worker scripts from jsDelivr CDN
2. Browsers enforce CORS policies for Web Workers
3. The CDN doesn't set appropriate CORS headers for workers
4. Local development (localhost) can't load cross-origin workers

## Attempted Solution (Did Not Work)

We tried bundling the WASM files and workers locally using Vite's `?url` imports.

### Implementation

In `duckdbClient.ts`:

```typescript
// ❌ OLD: Causes CORS errors
const bundles = duckdb.getJsDelivrBundles();
const worker = new Worker(bundle.mainWorker!);

// ✅ NEW: Import bundles locally
const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: await import('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url').then(m => m.default),
    mainWorker: await import('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url').then(m => m.default),
  },
  eh: {
    mainModule: await import('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url').then(m => m.default),
    mainWorker: await import('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url').then(m => m.default),
  },
};

// ⚠️ CRITICAL: Must specify type: 'module' for ES modules
const worker = new Worker(bundle.mainWorker!, { 
  type: 'module',  // Required for ES module workers
  name: 'duckdb-worker'
});
```

### Vite Configuration

In `vite.config.ts`:

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'], // Don't pre-bundle WASM
  },
  worker: {
    format: 'es', // Use ES modules in workers
    plugins: () => [react()],
  },
  assetsInclude: ['**/*.wasm', '**/*.worker.js'],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

## Why This Works

1. **Local Imports**: Vite processes the imports and bundles them as local assets
2. **URL Imports**: The `?url` suffix tells Vite to return the asset URL instead of the content
3. **CORS Headers**: We set appropriate headers for SharedArrayBuffer support
4. **Worker Format**: ES modules format allows proper bundling by Vite
5. **Module Type**: `type: 'module'` tells the browser to load the worker as an ES module (required since Vite uses ES format)

## Testing

After the fix, you should see:

```
[DuckDB] Initializing DuckDB-WASM...
[DuckDB] DuckDB-WASM initialized in 1234ms
[DuckDB] Loading table 'my_data' from file: my_data.csv
[DuckDB] Table 'my_data' loaded in 567ms (1000 rows, 5 columns)
```

## Additional Notes

### SharedArrayBuffer Requirements

DuckDB-WASM requires SharedArrayBuffer for threading, which needs these headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These are automatically set by Vite in development. For production:

**Nginx:**
```nginx
add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;
```

**Apache:**
```apache
Header set Cross-Origin-Opener-Policy "same-origin"
Header set Cross-Origin-Embedder-Policy "require-corp"
```

**Vercel/Netlify:**
```json
// vercel.json or netlify.toml
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### Bundle Size Impact

Local bundling adds ~8-10MB to your production build:
- `duckdb-mvp.wasm`: ~4MB (fallback)
- `duckdb-eh.wasm`: ~4MB (preferred)
- Worker scripts: ~500KB each

This is acceptable because:
- WASM files are highly compressible (gzip reduces by ~50%)
- Lazy loading - only downloaded when user executes first query
- Better than CDN for reliability and offline support

## Troubleshooting

### Still seeing CORS errors?

1. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

2. **Verify imports are working:**
   ```typescript
   // In browser console:
   import('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url').then(console.log)
   ```

3. **Check network tab:**
   - Look for WASM file requests
   - Should be served from `localhost:5173`, not CDN

4. **Browser console:**
   - Enable verbose logging: `localStorage.debug = '*'`
   - Check for initialization errors

### Workers not loading?

1. **Check Vite worker config:**
   ```typescript
   worker: {
     format: 'es', // Must be 'es', not 'iife'
   }
   ```

2. **Verify worker URL:**
   ```typescript
   console.log(bundle.mainWorker); // Should be blob: or local URL
   ```

3. **Browser compatibility:**
   - Chrome/Edge: ✅ Full support
   - Firefox: ✅ Full support
   - Safari: ⚠️ May need extra config
   - Mobile: ⚠️ Limited SharedArrayBuffer support

## References

- [DuckDB-WASM Manual Bundle Loading](https://duckdb.org/docs/api/wasm/instantiation.html#manual-bundle-loading)
- [Vite Worker Guide](https://vitejs.dev/guide/features.html#web-workers)
- [SharedArrayBuffer Requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)
