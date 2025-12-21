import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import {
  getModelById,
  getModelTemplates,
  listModels,
  trainModel
} from '../services/modelTraining.js';
import { generateModelPlan } from '../services/modelPlanner.js';

const router = Router();

const trainSchema = z.object({
  projectId: z.string().min(1),
  datasetId: z.string().min(1),
  templateId: z.string().min(1),
  targetColumn: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  testSize: z.number().min(0.05).max(0.5).optional(),
  name: z.string().optional()
});

const planSchema = z.object({
  projectId: z.string().min(1),
  datasetId: z.string().min(1),
  targetColumn: z.string().optional(),
  problemType: z.enum(['classification', 'regression', 'clustering', 'forecasting', 'unspecified']).optional()
});

router.get('/templates', (_req: Request, res: Response) => {
  res.json({ templates: getModelTemplates() });
});

router.post('/plan', async (req: Request, res: Response) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.issues
    });
    return;
  }

  try {
    const plan = await generateModelPlan(parsed.data);
    res.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate model plan';
    res.status(400).json({ error: message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  const models = await listModels(projectId);
  models.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ models });
});

router.get('/:id', async (req: Request, res: Response) => {
  const model = await getModelById(req.params.id);
  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }
  res.json({ model });
});

router.get('/:id/artifact', async (req: Request, res: Response) => {
  const model = await getModelById(req.params.id);
  if (!model?.artifact?.path) {
    res.status(404).json({ error: 'Model artifact not found' });
    return;
  }
  res.download(model.artifact.path, model.artifact.filename);
});

router.post('/train', async (req: Request, res: Response) => {
  try {
    const parsed = trainSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
      return;
    }

    const result = await trainModel(parsed.data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const lower = message.toLowerCase();
    const status = lower.includes('not found')
      ? 404
      : lower.includes('unsupported') || lower.includes('required')
        ? 400
        : 500;

    res.status(status).json({
      error: 'Failed to train model',
      message
    });
  }
});

export default router;
