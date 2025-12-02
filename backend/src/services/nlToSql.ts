import { randomUUID } from 'node:crypto';

import { validateReadOnlySql } from './sqlValidator.js';

interface GenerateSqlOptions {
  nlQuery: string;
  defaultTable?: string;
}

export interface GeneratedSql {
  sql: string;
  rationale: string;
  queryId: string;
}

const KEYWORD_MAP: Record<string, string> = {
  project: 'projects',
  dataset: 'datasets',
  document: 'documents'
};

export function generateSqlFromNaturalLanguage({ nlQuery, defaultTable = 'projects' }: GenerateSqlOptions): GeneratedSql {
  const lower = nlQuery.toLowerCase();
  const table = Object.entries(KEYWORD_MAP).find(([keyword]) => lower.includes(keyword))?.[1] ?? defaultTable;
  const sql = `SELECT * FROM ${table} LIMIT 50`;
  validateReadOnlySql(sql, { defaultLimit: 50, maxRows: 1000 });

  return {
    sql,
    rationale: `Auto-generated query targeting ${table} based on keywords in the prompt.`,
    queryId: randomUUID()
  };
}
