import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';


import { env } from '../config.js';
import { getDbPool, hasDatabaseConfiguration } from '../db.js';
import type { QueryResultPayload } from '../types/query.js';

import { buildEdaSummary } from './edaSummary.js';
import { validateReadOnlySql } from './sqlValidator.js';

export async function executeReadOnlyQuery({ sql }: { sql: string }): Promise<QueryResultPayload> {
  if (!hasDatabaseConfiguration()) {
    throw Object.assign(new Error('Database is not configured'), { statusCode: 503 });
  }

  const { normalizedSql } = validateReadOnlySql(sql, {
    defaultLimit: env.sqlDefaultLimit,
    maxRows: env.sqlMaxRows
  });

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = ${env.sqlStatementTimeoutMs}`);
    const startedAt = Date.now();
    const result = await client.query(normalizedSql);
    const executionMs = Date.now() - startedAt;
    await client.query('COMMIT');

    const limitedRows = result.rows.slice(0, env.sqlMaxRows);
    const eda = buildEdaSummary(limitedRows) ?? undefined;

    return {
      queryId: randomUUID(),
      sql: normalizedSql,
      columns: (result.fields ?? []).map((field) => ({
        name: field.name,
        dataTypeID: field.dataTypeID
      })),
      rows: limitedRows,
      rowCount: limitedRows.length,
      executionMs,
      cached: false,
      eda
    };
  } catch (error) {
    await safeRollback(client);
    throw error;
  } finally {
    client.release();
  }
}

async function safeRollback(client: PoolClient) {
  try {
    await client.query('ROLLBACK');
  } catch (error) {
    console.error('[sqlExecutor] Failed to rollback transaction', error);
  }
}
