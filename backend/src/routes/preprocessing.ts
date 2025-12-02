/**
 * Preprocessing Routes
 * 
 * Endpoints for analyzing datasets and generating preprocessing suggestions.
 */

import { Router } from 'express';
import { z } from 'zod';

import { hasDatabaseConfiguration, getDbPool } from '../db.js';
import { analyzeDataForPreprocessing } from '../services/preprocessingSuggestions.js';
import type { QueryRow } from '../types/query.js';

const analyzeSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  tableName: z.string().min(1, 'tableName is required'),
  sampleSize: z.number().int().min(100).max(10000).optional().default(1000)
});

export function createPreprocessingRouter() {
  const router = Router();

  /**
   * POST /preprocessing/analyze
   * 
   * Analyzes a dataset table and returns preprocessing suggestions.
   * Uses a sample of the data for performance.
   */
  router.post('/preprocessing/analyze', async (req, res) => {
    console.log('[preprocessing] Analyze request:', req.body);
    
    const result = analyzeSchema.safeParse(req.body);
    if (!result.success) {
      console.log('[preprocessing] Validation error:', result.error.flatten());
      return res.status(400).json({ errors: result.error.flatten() });
    }

    if (!hasDatabaseConfiguration()) {
      return res.status(503).json({ error: 'Database is not configured' });
    }

    const { projectId, tableName, sampleSize } = result.data;

    try {
      const pool = getDbPool();
      
      // Fetch sample data from the table
      // Use TABLESAMPLE for large tables, or regular LIMIT for smaller ones
      const countResult = await pool.query(
        `SELECT COUNT(*)::integer as count FROM "${tableName}"`
      );
      const totalRows = countResult.rows[0].count;

      let sampleQuery: string;
      if (totalRows > sampleSize * 2) {
        // Use random sampling for large tables
        sampleQuery = `SELECT * FROM "${tableName}" ORDER BY RANDOM() LIMIT ${sampleSize}`;
      } else {
        // Just get all rows for smaller tables
        sampleQuery = `SELECT * FROM "${tableName}" LIMIT ${sampleSize}`;
      }

      const dataResult = await pool.query(sampleQuery);
      const rows: QueryRow[] = dataResult.rows;

      if (rows.length === 0) {
        return res.json({
          analysis: {
            rowCount: 0,
            columnCount: 0,
            duplicateRowCount: 0,
            columnProfiles: [],
            suggestions: []
          },
          metadata: {
            tableName,
            totalRows: 0,
            sampledRows: 0,
            samplePercentage: 0
          }
        });
      }

      // Run preprocessing analysis
      const analysis = analyzeDataForPreprocessing(rows);

      return res.json({
        analysis,
        metadata: {
          tableName,
          totalRows,
          sampledRows: rows.length,
          samplePercentage: totalRows > 0 ? (rows.length / totalRows) * 100 : 100
        }
      });
    } catch (error) {
      console.error('[preprocessing] Analysis failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze dataset';
      return res.status(400).json({ error: message });
    }
  });

  /**
   * GET /preprocessing/tables
   * 
   * Lists available tables that can be analyzed.
   */
  router.get('/preprocessing/tables', async (req, res) => {
    if (!hasDatabaseConfiguration()) {
      return res.status(503).json({ error: 'Database is not configured' });
    }

    const projectId = req.query.projectId as string | undefined;

    try {
      const pool = getDbPool();
      
      // Get all user tables (excluding system tables)
      const result = await pool.query(`
        SELECT 
          table_name,
          pg_total_relation_size(quote_ident(table_name)) as size_bytes
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('projects', 'datasets', 'documents', 'chunks', 'embeddings', 'query_results', 'query_cache')
        ORDER BY table_name
      `);

      const tables = result.rows.map(row => ({
        name: row.table_name,
        sizeBytes: parseInt(row.size_bytes, 10)
      }));

      return res.json({ tables });
    } catch (error) {
      console.error('[preprocessing] Failed to list tables:', error);
      return res.status(500).json({ error: 'Failed to list tables' });
    }
  });

  return router;
}


