# Query Engine: DuckDB-WASM Implementation

## Overview

The query engine enables interactive SQL exploration of uploaded datasets directly in the browser using DuckDB-WASM. This document describes the architecture, data flow, and implementation details.

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                         React UI Layer                           │
├──────────────────────────────────────────────────────────────────┤
│  QueryPanel                   DataViewerTab                      │
│  ├─ SQL Editor (Monaco)       ├─ File Tab Bar                    │
│  ├─ English Input             ├─ Query Execution Handler         │
│  └─ Execute Button            └─ Result Display                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DuckDB Service Layer                          │
├──────────────────────────────────────────────────────────────────┤
│  DuckDBService (Singleton)                                       │
│  ├─ Connection Management                                        │
│  │   ├─ Lazy initialization                                      │
│  │   ├─ Connection pooling                                       │
│  │   └─ Worker lifecycle                                         │
│  │                                                               │
│  ├─ Table Management                                            │
│  │   ├─ CSV → DuckDB table registration                         │
│  │   ├─ Schema inference                                         │
│  │   ├─ Table name sanitization                                 │
│  │   └─ Table metadata tracking                                 │
│  │                                                               │
│  ├─ Query Execution                                             │
│  │   ├─ SQL query execution                                      │
│  │   ├─ Result streaming                                         │
│  │   ├─ Error handling & formatting                             │
│  │   ├─ Query timeout management                                │
│  │   └─ Execution metrics (time, rows)                          │
│  │                                                               │
│  └─ Resource Management                                          │
│      ├─ Memory monitoring                                        │
│      ├─ Table cleanup                                            │
│      └─ Connection disposal                                      │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DuckDB-WASM Runtime                           │
├──────────────────────────────────────────────────────────────────┤
│  @duckdb/duckdb-wasm                                             │
│  ├─ AsyncDuckDB (main API)                                      │
│  ├─ DuckDBConnection (query interface)                          │
│  ├─ Web Worker (background execution)                           │
│  └─ WASM Module (~8MB)                                          │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. File Upload → Table Registration

```typescript
User uploads CSV
    ↓
DataUploadPanel parses with PapaParse
    ↓
DataStore.addFile() + addPreview()
    ↓
DuckDBService.loadTable(fileId, file)
    ↓
DuckDB: CREATE TABLE {tableName} AS SELECT * FROM read_csv_auto(...)
    ↓
Table registered and queryable
```

**Key Details:**
- Table name = sanitized filename (e.g., `sales-data.csv` → `sales_data`)
- Schema inferred automatically by DuckDB
- Original File object held in memory for re-loading if needed
- Multiple files create multiple tables in same DuckDB instance

### 2. Query Execution

```typescript
User writes SQL in QueryPanel
    ↓
QueryPanel.handleExecute(query, mode)
    ↓
DataViewerTab.handleExecuteQuery(query, mode)
    ↓
DuckDBService.executeQuery(sql)
    ↓
DuckDB: Execute SQL, return Arrow table
    ↓
Convert Arrow → DataPreview format
    ↓
DataStore.createArtifact(query, result)
    ↓
Switch to new artifact tab
    ↓
DataTable renders results
```

**Query Processing Steps:**
1. **Validation**: Check SQL syntax, table existence
2. **Execution**: Run query in DuckDB worker
3. **Transformation**: Convert Arrow IPC to JSON rows
4. **Metadata**: Extract execution time, row count, column types
5. **Artifact Creation**: Save query + results for tab persistence
6. **UI Update**: Switch to new result tab, render table

### 3. Result Display

```typescript
DataTable receives DataPreview
    ↓
TanStack Table renders with:
    ├─ Column headers (from DuckDB schema)
    ├─ Row data (first N rows)
    ├─ Pagination controls
    ├─ Search/filter
    └─ Export options
```

## Implementation Details

### DuckDBService Class

```typescript
class DuckDBService {
  private static instance: DuckDBService;
  private db: AsyncDuckDB | null = null;
  private conn: DuckDBConnection | null = null;
  private isInitialized: boolean = false;
  private loadedTables: Map<string, TableMetadata> = new Map();

  // Singleton pattern
  static getInstance(): DuckDBService;

  // Lifecycle
  async initialize(): Promise<void>;
  async dispose(): Promise<void>;

  // Table management
  async loadTable(fileId: string, file: File): Promise<string>;
  async dropTable(tableName: string): Promise<void>;
  getLoadedTables(): TableMetadata[];

  // Query execution
  async executeQuery(sql: string): Promise<QueryResult>;
  async cancelQuery(): Promise<void>;

  // Utilities
  async getTableSchema(tableName: string): Promise<ColumnSchema[]>;
  sanitizeTableName(filename: string): string;
}
```

### Type Definitions

```typescript
interface TableMetadata {
  tableName: string;
  fileId: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnSchema[];
  loadedAt: Date;
  sizeBytes: number;
}

interface ColumnSchema {
  name: string;
  type: string; // DuckDB type (INTEGER, VARCHAR, etc.)
  nullable: boolean;
}

interface QueryResult {
  rows: Record<string, unknown>[];
  columns: ColumnSchema[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean; // If result set was limited
}

interface QueryError {
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}
```

### Error Handling

DuckDB errors are caught and transformed into user-friendly messages:

```typescript
try {
  const result = await conn.query(sql);
  return result;
} catch (error) {
  if (error.message.includes('Table not found')) {
    throw new QueryError({
      message: `Table '${tableName}' does not exist`,
      suggestion: `Available tables: ${loadedTables.keys().join(', ')}`
    });
  }
  // ... more error cases
}
```

**Common Error Cases:**
- Table not found → Show available tables
- Syntax error → Highlight line/column in Monaco Editor
- Memory exceeded → Suggest adding LIMIT clause
- Column not found → Suggest similar column names (fuzzy match)

### Performance Optimizations

#### 1. Lazy Initialization
```typescript
async executeQuery(sql: string) {
  if (!this.isInitialized) {
    await this.initialize(); // Load WASM on first query
  }
  // ... execute query
}
```

#### 2. Result Pagination
```typescript
// Automatically limit large result sets
const MAX_ROWS = 10000;
const wrappedSQL = `SELECT * FROM (${userSQL}) LIMIT ${MAX_ROWS}`;
```

#### 3. Arrow IPC Streaming
```typescript
// Use Arrow IPC for efficient data transfer from WASM
const arrowTable = await conn.query(sql);
const batch = arrowTable.toArray(); // Convert to JS objects
```

#### 4. Table Caching
```typescript
// Cache table metadata to avoid repeated schema queries
private tableCache: Map<string, TableMetadata> = new Map();
```

## Memory Management

### Dataset Size Limits

| Size | Status | Load Time | Query Time | Notes |
|------|--------|-----------|------------|-------|
| <1MB | ✅ Excellent | <500ms | <100ms | Instant experience |
| 1-10MB | ✅ Good | 1-3s | 100-500ms | Slight delay |
| 10-50MB | ⚠️ Acceptable | 5-15s | 500ms-2s | Loading indicator needed |
| 50-100MB | ⚠️ Slow | 15-30s | 2-5s | Consider backend |
| >100MB | ❌ Not recommended | >30s | >5s | Use backend API |

### Memory Monitoring

```typescript
// Warn user when approaching browser memory limits
if (performance.memory) {
  const usedMemory = performance.memory.usedJSHeapSize;
  const memoryLimit = performance.memory.jsHeapSizeLimit;
  
  if (usedMemory / memoryLimit > 0.8) {
    console.warn('Memory usage high, consider reducing dataset size');
  }
}
```

## Query Capabilities

### Supported SQL Features (DuckDB SQL)

✅ **SELECT statements**
- Column selection, aliases
- WHERE clauses with complex conditions
- ORDER BY, LIMIT, OFFSET
- DISTINCT, ALL

✅ **Aggregations**
- COUNT, SUM, AVG, MIN, MAX
- GROUP BY, HAVING
- Window functions (ROW_NUMBER, RANK, LAG, LEAD)

✅ **Joins**
- INNER, LEFT, RIGHT, FULL OUTER
- CROSS JOIN
- Self-joins
- Multiple table joins

✅ **Subqueries**
- Scalar subqueries
- Correlated subqueries
- CTEs (WITH clauses)

✅ **Data Types**
- INTEGER, BIGINT, DOUBLE
- VARCHAR, TEXT
- DATE, TIMESTAMP
- BOOLEAN
- NULL handling

✅ **Functions**
- String functions (CONCAT, SUBSTRING, UPPER, LOWER)
- Date functions (DATE_PART, DATE_DIFF, CURRENT_DATE)
- Math functions (ROUND, CEIL, FLOOR, ABS)
- Conditional (CASE, COALESCE, NULLIF)

❌ **Not Supported (Browser Limitations)**
- User-defined functions (UDFs)
- External file reads (security)
- COPY TO/FROM (limited)
- Extensions (most require Node.js)

## Testing Strategy

### Unit Tests
- `DuckDBService.initialize()` loads WASM correctly
- `sanitizeTableName()` handles edge cases
- Error handling for invalid SQL
- Memory cleanup on dispose

### Integration Tests
- Upload CSV → Table registered
- Execute query → Correct results
- Multiple tables → JOIN works
- Large dataset → Pagination works
- Invalid query → User-friendly error

### Performance Tests
- 1K rows: <100ms query time
- 10K rows: <500ms query time
- 100K rows: <2s query time
- Memory usage stays under limit

## Future Enhancements

### Phase 2: Backend Offloading
- Add environment flag: `USE_BACKEND_QUERY_ENGINE`
- Keep DuckDBService interface unchanged
- Proxy queries to backend when flag enabled
- Use same SQL syntax (DuckDB backend)

### Phase 3: Advanced Features
- Query result visualization (charts)
- Query history and favorites
- SQL autocomplete with table/column suggestions
- Query performance explain plans
- Multi-query support (run multiple queries in sequence)

### Phase 4: Natural Language Queries
- LLM integration for English → SQL translation
- Context-aware query generation using business docs
- Query validation before execution
- Suggested queries based on data schema

## Configuration

### Vite Configuration

DuckDB-WASM requires special Vite configuration for worker assets:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'], // Don't pre-bundle WASM
    esbuildOptions: {
      target: 'esnext', // Required for top-level await
    }
  },
  worker: {
    format: 'es', // Use ES modules in workers
  },
  // Copy WASM files to dist
  assetsInclude: ['**/*.wasm'],
})
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "WebWorker"]
  }
}
```

## Troubleshooting

### Common Issues

**"Failed to load WASM module"**
- Ensure Vite is configured correctly for WASM assets
- Check browser console for CORS errors
- Verify worker bundle is in `public/` or correctly imported

**"Table not found" error**
- Verify CSV was uploaded and parsed
- Check table name matches file name (sanitized)
- Use `DuckDBService.getLoadedTables()` to list available tables

**"Out of memory" error**
- Dataset too large for browser (>100MB)
- Add LIMIT clause to queries
- Consider pagination or backend offload

**Slow query performance**
- Check query complexity (multiple JOINs, subqueries)
- Add LIMIT clause for initial exploration
- Consider creating indexes (future feature)

## References

- [DuckDB-WASM Documentation](https://duckdb.org/docs/api/wasm/overview.html)
- [DuckDB SQL Reference](https://duckdb.org/docs/sql/introduction)
- [Apache Arrow IPC Format](https://arrow.apache.org/docs/format/Columnar.html)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-09-30 | Team | Initial architecture design |
| 2025-09-30 | Team | DuckDB-WASM integration started |
