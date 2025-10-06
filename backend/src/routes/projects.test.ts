import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

let tempDir: string;
let storagePath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'automl-backend-'));
  storagePath = join(tempDir, 'projects.json');
  process.env.STORAGE_PATH = storagePath;
  vi.resetModules();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.STORAGE_PATH;
  vi.resetModules();
});

test('projects persist across app instances', async () => {
  const { createApp } = await import('../app.js');
  const app = createApp();

  const createResponse = await request(app)
    .post('/api/projects')
    .send({ name: 'Persistent Project' })
    .expect(201);

  const createdId: string = createResponse.body.project.id;

  const { createApp: createSecondApp } = await import('../app.js');
  const secondApp = createSecondApp();

  const listResponse = await request(secondApp).get('/api/projects').expect(200);

  expect(listResponse.body.projects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: createdId, name: 'Persistent Project' })
    ])
  );
});
