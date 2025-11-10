import { createHash } from 'node:crypto';

export function hashSql(projectId: string, sql: string): string {
  const normalized = sql.trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(`${projectId}:${normalized}`).digest('hex');
}
