import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { hasDatabaseConfiguration } from '../db.js';
import { ingestDocument } from '../services/documentIngestion.js';
import { parseDocument } from '../services/documentParser.js';
import { searchDocuments } from '../services/documentSearchService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const uploadSchema = z.object({
  projectId: z.string().uuid().optional()
});

export function createDocumentRouter() {
  const router = Router();

  router.post('/upload/doc', upload.single('file'), async (req, res) => {
    const result = uploadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'file field is required' });
    }

    if (!hasDatabaseConfiguration()) {
      return res.status(503).json({ error: 'Database is not configured for document ingestion' });
    }

    try {
      const parsed = await parseDocument(req.file.buffer, req.file.mimetype);
      const ingested = await ingestDocument({
        projectId: result.data.projectId,
        filename: req.file.originalname,
        mimeType: req.file.mimetype ?? parsed.mimeType,
        buffer: req.file.buffer,
        document: parsed
      });

      return res.status(201).json({
        document: {
          documentId: ingested.documentId,
          projectId: ingested.projectId,
          filename: req.file.originalname,
          mimeType: req.file.mimetype ?? parsed.mimeType,
          chunkCount: ingested.chunkCount,
          embeddingDimension: ingested.embeddingDimension
        }
      });
    } catch (error) {
      console.error('[documents] failed to ingest', error);
      return res.status(500).json({ error: 'Failed to ingest document' });
    }
  });

  router.get('/docs/search', async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = Number.parseInt(String(req.query.k ?? '5'), 10);

    if (!query.trim()) {
      return res.status(400).json({ error: 'q parameter is required' });
    }

    if (!hasDatabaseConfiguration()) {
      return res.status(503).json({ error: 'Database is not configured for document search' });
    }

    const results = await searchDocuments({
      projectId,
      query,
      limit: Number.isNaN(limit) ? 5 : Math.min(20, Math.max(1, limit))
    });

    return res.json({
      results
    });
  });

  return router;
}
