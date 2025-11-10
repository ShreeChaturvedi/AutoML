# API Contracts – Query, Documents, Answering

This document gives the definitive request/response schemas for the Sprint 3 + Sprint 4 endpoints so the frontend and backend stay in sync.

## `/api/query/sql` (POST)

**Request**

```ts
interface SqlQueryRequest {
  projectId: string; // UUID
  sql: string;       // Read-only SELECT/CTE
}
```

**Response**

```ts
interface SqlQueryResponse {
  query: {
    queryId: string;
    sql: string;
    columns: Array<{ name: string; dataTypeID?: number }>;
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    executionMs: number;
    eda?: {
      numericColumns: Array<{ column: string; min: number; max: number; mean: number; stdDev: number }>;
      histogram?: { column: string; buckets: Array<{ start: number; end: number; count: number }> };
      scatter?: { xColumn: string; yColumn: string; points: Array<{ x: number; y: number }> };
      correlations?: Array<{ columnA: string; columnB: string; coefficient: number }>;
    };
    cached: boolean;
    cacheTimestamp?: string;
  };
}
```

Notes: non-SELECT statements are rejected (`400`). When Postgres is unavailable the API returns `503`.

## `/api/query/nl` (POST)

**Request**

```ts
interface NlQueryRequest {
  projectId: string;
  query: string; // natural language prompt
}
```

**Response**

```ts
interface NlQueryResponse {
  nl: {
    sql: string;
    rationale: string;
    queryId: string;
    cached: boolean;
    query: SqlQueryResponse['query'];
  };
}
```

## `/api/upload/doc` (POST, multipart/form-data)

Form fields:

| Field      | Type                | Notes                                    |
| ---------- | ------------------- | ---------------------------------------- |
| `file`     | File                | Required. Accepts `pdf`, `md`, `txt`.    |
| `projectId`| String (UUID)       | Optional; associates docs with projects. |

**Response**

```ts
interface UploadDocResponse {
  document: {
    documentId: string;
    projectId?: string;
    filename: string;
    mimeType: string;
    chunkCount: number;
    embeddingDimension: number;
  };
}
```

## `/api/docs/search` (GET)

Query parameters:

| Param      | Description                                    |
| ---------- | ---------------------------------------------- |
| `q`        | Required search query                          |
| `projectId`| Optional UUID filter                           |
| `k`        | Optional top-k (default 5, max 20)             |

**Response**

```ts
interface DocsSearchResponse {
  results: Array<{
    chunkId: string;
    documentId: string;
    filename: string;
    score: number;        // cosine + reranker blend
    snippet: string;
    span: { start: number; end: number };
  }>;
}
```

## `/api/answer` (POST)

**Request**

```ts
interface AnswerRequest {
  projectId?: string;
  question: string;
  topK?: number; // default 5, max 10
}
```

**Response**

```ts
interface AnswerResponse {
  answer: {
    status: 'ok' | 'not_found';
    answer: string;
    citations: Array<{
      chunkId: string;
      documentId: string;
      filename: string;
      span: { start: number; end: number };
    }>;
    meta: {
      cached: boolean;
      latencyMs: number;
      chunksConsidered: number;
      cacheTimestamp?: string;
    };
  };
}
```

When the document store cannot produce supporting evidence the endpoint returns `status: "not_found"` with an explanatory message.

---

👩‍💻 **Integration tips**

- Use `QUERY_CACHE_TTL_MS`, `ANSWER_CACHE_TTL_MS`, and `sqlDefaultLimit` values (available via `/api/query/cache/config`) to drive UI messaging such as “served from cache” badges.
- `/api/upload/doc` may take longer for large PDFs; show progress spinners and handle `413` responses for files larger than 25 MB.
- For staged rollouts, guard new UI panels behind feature flags, but keep payload shapes aligned with the contracts above.
