# ADR-002: DuckDB-WASM for Client-Side Query Engine

**Status:** Accepted  
**Date:** 2025-09-30  
**Decision Makers:** Development Team  

## Context

The Data Viewer phase requires executing SQL queries against uploaded CSV datasets. Users need to:
- Write and execute SQL queries (SELECT, WHERE, JOIN, aggregations)
- See results immediately without backend round trips
- Handle datasets ranging from small (1K rows) to medium (100K rows)
- Eventually support natural language → SQL translation via LLM

We evaluated three approaches:

### Option 1: Backend-Only SQL Engine
**Pros:**
- Can scale to very large datasets
- Centralized query logging and caching
- Easier security controls

**Cons:**
- Requires backend infrastructure (not yet built)
- Network latency for every query
- Blocks MVP progress (frontend-only demo)
- Doubles development effort (frontend + backend)

### Option 2: SQL.js (SQLite in WASM)
**Pros:**
- Small bundle (~1MB)
- Well-established, stable library
- Familiar SQLite syntax

**Cons:**
- Row-oriented storage (slow for analytics)
- No native CSV/Parquet readers
- Limited SQL features (no window functions in older versions)
- Manual schema management required
- Not optimized for OLAP workloads

### Option 3: DuckDB-WASM (Selected)
**Pros:**
- Columnar storage optimized for analytics (10-100x faster than SQLite)
- Native CSV/Parquet/JSON readers with schema inference
- Full SQL:2016 support (window functions, CTEs, complex joins)
- Same engine can run on backend later (DuckDB Node.js/Python)
- Active development and growing ecosystem
- Excellent documentation and examples

**Cons:**
- Larger bundle size (~8MB WASM + workers)
- Newer library (more risk of breaking changes)
- Requires Vite/Webpack configuration for workers

## Decision

We will use **DuckDB-WASM** for client-side SQL execution in the Data Viewer phase.

### Implementation Strategy

1. **Lazy Loading**: DuckDB-WASM loads only when user first executes a query
2. **In-Memory Tables**: CSV files are loaded into DuckDB tables on upload
3. **Table Naming**: Use sanitized filename as table name (e.g., `sales_data.csv` → `sales_data`)
4. **Query Isolation**: Each query runs in same connection but results are isolated
5. **Error Handling**: SQL errors are caught and displayed in UI with helpful messages
6. **Migration Path**: DuckDB backend can be added later without changing SQL syntax

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ DataViewerTab.tsx                                           │
│  ├─ QueryPanel (user writes SQL)                           │
│  └─ DataTable (displays results)                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ DuckDBService (singleton)                                   │
│  ├─ initialize(): Promise<void>                            │
│  │   └─ Load WASM worker, configure paths                  │
│  ├─ loadTable(fileId, file): Promise<void>                 │
│  │   └─ Read CSV, infer schema, CREATE TABLE               │
│  ├─ executeQuery(sql): Promise<QueryResult>                │
│  │   └─ Run query, return rows + metadata                  │
│  └─ dispose(): Promise<void>                               │
│      └─ Cleanup connections                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ @duckdb/duckdb-wasm                                         │
│  ├─ AsyncDuckDB (main API)                                 │
│  ├─ DuckDBBundles (worker bundles)                         │
│  └─ Web Worker (background execution)                      │
└─────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive
- **Fast MVP**: Unblocks Data Viewer demo without backend dependency
- **Better UX**: Instant query results (no network latency)
- **Future-Proof**: Can migrate to DuckDB backend when needed
- **Professional Demo**: Complex SQL queries work out-of-the-box
- **Offline Support**: Works without internet connection

### Negative
- **Bundle Size**: Adds ~8MB to initial bundle (mitigated by lazy loading)
- **Memory Usage**: Large datasets (>50MB) may cause browser slowdown
- **Learning Curve**: Team needs to learn DuckDB APIs and WASM worker setup
- **Configuration**: Requires Vite configuration for WASM/worker assets

### Trade-offs Accepted
- We accept larger bundle size for superior query performance
- We accept client-side limitations (dataset size) for faster MVP
- We accept WASM complexity for better user experience

## Future Considerations

### Backend Migration (Phase 2)
When backend is ready:
1. Add API endpoint: `POST /api/projects/:id/query`
2. Keep DuckDBService interface unchanged
3. Add environment flag to switch between client/server execution
4. Use DuckDB on backend for consistency

### Dataset Size Limits
Current approach works for:
- ✅ Small datasets: <1MB (instant)
- ✅ Medium datasets: 1-10MB (few seconds)
- ⚠️ Large datasets: 10-50MB (10-30 seconds)
- ❌ Very large datasets: >50MB (use backend)

### Performance Optimization (Future)
- Implement query result pagination (LIMIT/OFFSET)
- Add query result caching
- Stream large results instead of loading all rows
- Use DuckDB's `COPY TO` for export without loading into JS

## References

- [DuckDB-WASM Documentation](https://duckdb.org/docs/api/wasm/overview.html)
- [DuckDB-WASM React Example](https://github.com/duckdb/duckdb-wasm/tree/main/packages/duckdb-wasm-app)
- [Why DuckDB is Fast](https://duckdb.org/why_duckdb)
- [DuckDB SQL Reference](https://duckdb.org/docs/sql/introduction)

## Implementation Tracking

- **ADR Created**: 2025-09-30
- **Implementation Start**: 2025-09-30
- **Target Completion**: 2025-10-02
- **Integration Testing**: 2025-10-03
