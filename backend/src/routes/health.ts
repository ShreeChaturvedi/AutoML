import os from 'node:os';

import type { Router } from 'express';

export function registerHealthRoutes(router: Router) {
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      host: os.hostname()
    });
  });
}
