import { writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { env } from '../config.js';
import type { DatasetRepository } from '../repositories/datasetRepository.js';
import { createDatasetRepository } from '../repositories/datasetRepository.js';
import { profileDataset } from '../services/datasetProfiler.js';
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

  router.get('/datasets', (_req, res) => {
    res.json({ datasets: datasetRepository.list() });
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

        const dataset = datasetRepository.create({
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

        console.log(
          `[datasets] stored ${req.file.originalname} (${fileType}) as ${dataset.datasetId}`
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
            createdAt: dataset.createdAt
          }
        });
      } catch (error) {
        console.error('[datasetUpload] failed to process dataset', error);
        console.log(`[datasets] error processing ${req.file.originalname}`);
        return res.status(400).json({ error: 'Failed to process dataset. Ensure the file format is valid.' });
      }
    }
  );

  return router;
}
