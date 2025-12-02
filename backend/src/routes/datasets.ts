import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { env } from '../config.js';
import { getDbPool, hasDatabaseConfiguration } from '../db.js';
import type { DatasetRepository } from '../repositories/datasetRepository.js';
import { createDatasetRepository } from '../repositories/datasetRepository.js';
import { profileDataset } from '../services/datasetProfiler.js';
import { loadDatasetIntoPostgres } from '../services/datasetLoader.js';
import type { DatasetFileType } from '../types/dataset.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

const datasetUploadSchema = z.object({
  projectId: z.string().optional()
});

const SUPPORTED_EXTENSIONS: Record<string, DatasetFileType> = {
  '.csv': 'csv',
  '.json': 'json',
  '.xlsx': 'xlsx',
  '.xls': 'xlsx'
};

const SUPPORTED_MIME_TYPES: Partial<Record<string, DatasetFileType>> = {
  'text/csv': 'csv',
  'application/json': 'json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
};

function detectFileType(filename: string, mimetype?: string): DatasetFileType | undefined {
  if (mimetype && SUPPORTED_MIME_TYPES[mimetype]) {
    return SUPPORTED_MIME_TYPES[mimetype];
  }
  const extension = extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS[extension];
}

export function createDatasetUploadRouter(repository?: DatasetRepository) {
  const router = Router();
  const datasetRepository = repository ?? createDatasetRepository(env.datasetMetadataPath);

  router.get('/datasets', async (req, res) => {
    const projectId = req.query.projectId as string | undefined;
    let datasets = await datasetRepository.list();

    // Filter by projectId if provided
    if (projectId) {
      datasets = datasets.filter(d => d.projectId === projectId);
    }

    res.json({ datasets });
  });

  router.get('/datasets/:datasetId/sample', async (req, res) => {
    const { datasetId } = req.params;

    try {
      const dataset = await datasetRepository.getById(datasetId);
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found' });
      }

      // Return the sample data that was already profiled during upload
      res.json({
        sample: dataset.sample,
        columns: dataset.columns.map(c => c.name),
        rowCount: dataset.nRows
      });
    } catch (error) {
      console.error(`[datasets] Failed to get sample for ${datasetId}`, error);
      return res.status(500).json({ error: 'Failed to retrieve dataset sample' });
    }
  });

  router.post(
    '/upload/dataset',
    upload.single('file'),
    async (req, res) => {
      const parseResult = datasetUploadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ errors: parseResult.error.flatten() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'file field is required' });
      }

      const fileType = detectFileType(req.file.originalname, req.file.mimetype);
      if (!fileType) {
        return res.status(400).json({ error: `Unsupported file type: ${req.file.originalname}` });
      }

      try {
        const profiling = profileDataset(req.file.buffer, fileType);

        const dataset = await datasetRepository.create({
          projectId: parseResult.data.projectId,
          filename: req.file.originalname,
          fileType,
          size: req.file.size,
          profile: {
            nRows: profiling.nRows,
            columns: profiling.columns,
            sample: profiling.sample
          }
        });

        const datasetDir = join(env.datasetStorageDir, dataset.datasetId);
        mkdirSync(datasetDir, { recursive: true });
        const filePath = join(datasetDir, req.file.originalname);
        writeFileSync(filePath, req.file.buffer);

        const { tableName, rowsLoaded } = await loadDatasetIntoPostgres({
          datasetId: dataset.datasetId,
          filename: req.file.originalname,
          fileType,
          buffer: req.file.buffer,
          columns: profiling.columns
        });

        console.log(
          `[datasets] Stored ${req.file.originalname} (${fileType}) -> table "${tableName}" (${rowsLoaded} rows)`
        );

        return res.status(201).json({
          dataset: {
            datasetId: dataset.datasetId,
            filename: dataset.filename,
            fileType: dataset.fileType,
            size: dataset.size,
            n_rows: dataset.nRows,
            n_cols: dataset.nCols,
            columns: dataset.columns.map((column) => column.name),
            dtypes: Object.fromEntries(dataset.columns.map((column) => [column.name, column.dtype])),
            null_counts: Object.fromEntries(dataset.columns.map((column) => [column.name, column.nullCount])),
            sample: dataset.sample,
            createdAt: dataset.createdAt,
            tableName
          }
        });
      } catch (error) {
        console.error('[datasets] Upload failed:', error instanceof Error ? error.message : String(error));
        return res.status(400).json({
          error: 'Failed to process dataset. Ensure the file format is valid.',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // Migration endpoint: Create tables for existing datasets
  router.post('/datasets/migrate', async (req, res) => {
    try {
      const datasets = await datasetRepository.list();

      const results = {
        migrated: [] as string[],
        skipped: [] as string[],
        errors: [] as { datasetId: string; error: string }[]
      };

      for (const dataset of datasets) {
        try {
          const datasetDir = join(env.datasetStorageDir, dataset.datasetId);
          const filePath = join(datasetDir, dataset.filename);

          if (!existsSync(filePath)) {
            results.skipped.push(dataset.datasetId);
            continue;
          }

          const buffer = readFileSync(filePath);
          const { tableName, rowsLoaded } = await loadDatasetIntoPostgres({
            datasetId: dataset.datasetId,
            filename: dataset.filename,
            fileType: dataset.fileType,
            buffer,
            columns: dataset.columns
          });

          console.log(`[datasets] Migrated ${dataset.filename} -> "${tableName}" (${rowsLoaded} rows)`);
          results.migrated.push(dataset.datasetId);

        } catch (error) {
          console.error(`[datasets] Migration failed for ${dataset.filename}:`, error instanceof Error ? error.message : String(error));
          results.errors.push({
            datasetId: dataset.datasetId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      console.log(`[datasets] Migration complete: ${results.migrated.length} migrated, ${results.skipped.length} skipped, ${results.errors.length} errors`);

      return res.json({
        success: true,
        results
      });

    } catch (error) {
      console.error('[datasets] Migration failed:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete dataset endpoint
  router.delete('/datasets/:datasetId', async (req, res) => {
    const { datasetId } = req.params;

    try {
      const dataset = await datasetRepository.getById(datasetId);
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found' });
      }

      const deleted = await datasetRepository.delete(datasetId);
      if (!deleted) {
        return res.status(404).json({ error: 'Dataset not found' });
      }

      // Delete physical files
      const datasetDir = join(env.datasetStorageDir, datasetId);
      if (existsSync(datasetDir)) {
        rmSync(datasetDir, { recursive: true, force: true });
      }

      // Drop Postgres table if it exists
      if (hasDatabaseConfiguration()) {
        try {
          const pool = getDbPool();
          const tableName = dataset.filename
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[^a-zA-Z]/, 'table_')
            .toLowerCase()
            .slice(0, 63);

          await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
        } catch (error) {
          console.error(`[datasets] Failed to drop table:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log(`[datasets] Deleted ${datasetId}`);
      return res.json({ success: true });

    } catch (error) {
      console.error(`[datasets] Delete failed:`, error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        error: 'Failed to delete dataset',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}
