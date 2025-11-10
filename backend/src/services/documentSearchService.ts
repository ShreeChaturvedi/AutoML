import { getDbPool } from '../db.js';

import { computeTextEmbedding, cosineSimilarity } from './embeddingService.js';

export interface DocumentSearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  score: number;
  snippet: string;
  span: { start: number; end: number };
}

interface SearchOptions {
  projectId?: string;
  query: string;
  limit: number;
}

export async function searchDocuments(options: SearchOptions): Promise<DocumentSearchResult[]> {
  const pool = getDbPool();
  const rows = await pool.query(
    `SELECT e.chunk_id,
            e.embedding,
            c.content,
            c.span,
            d.filename,
            d.document_id
       FROM embeddings e
       JOIN chunks c ON c.chunk_id = e.chunk_id
       JOIN documents d ON d.document_id = c.document_id
      WHERE ($1::uuid IS NULL OR e.project_id = $1)
      ORDER BY c.created_at DESC
      LIMIT 1000`,
    [options.projectId ?? null]
  );

  if (rows.rowCount === 0) return [];

  const queryEmbedding = computeTextEmbedding(options.query);
  const queryTokens = tokenize(options.query);

  const scored = rows.rows.map((row) => {
    const embedding = row.embedding as number[];
    const chunkText = row.content as string;
    const cosine = cosineSimilarity(queryEmbedding, embedding);
    const keywordScore = computeKeywordScore(chunkText, queryTokens);
    const finalScore = cosine * 0.8 + keywordScore * 0.2;

    return {
      chunkId: row.chunk_id as string,
      documentId: row.document_id as string,
      filename: row.filename as string,
      score: Number(finalScore.toFixed(4)),
      snippet: buildSnippet(chunkText),
      span: row.span ?? { start: 0, end: 0 }
    };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit);
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\s+/).filter(Boolean));
}

function computeKeywordScore(text: string, queryTokens: Set<string>): number {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || queryTokens.size === 0) return 0;
  const hits = tokens.filter((token) => queryTokens.has(token));
  return hits.length / tokens.length;
}

function buildSnippet(text: string): string {
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}
