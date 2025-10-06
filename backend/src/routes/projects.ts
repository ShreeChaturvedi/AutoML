import type { Router } from 'express';
import { z } from 'zod';

import type { ProjectRepository } from '../repositories/projectRepository.js';

const projectInputSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().max(1000).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional()
});

export function registerProjectRoutes(router: Router, repository: ProjectRepository) {
  router.get('/projects', (_req, res) => {
    res.json({ projects: repository.list() });
  });

  router.get('/projects/:id', (req, res) => {
    const project = repository.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project });
  });

  router.post('/projects', (req, res) => {
    const result = projectInputSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }

    const project = repository.create(result.data);
    return res.status(201).json({ project });
  });

  router.patch('/projects/:id', (req, res) => {
    const result = projectInputSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }

    const project = repository.update(req.params.id, result.data);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project });
  });

  router.delete('/projects/:id', (req, res) => {
    const deleted = repository.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(204).send();
  });
}
