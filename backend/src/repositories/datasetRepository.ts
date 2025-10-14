import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { DatasetProfile, DatasetProfileInput } from '../types/dataset.js';

function ensureDirectory(path: string) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export interface DatasetRepository {
  list(): DatasetProfile[];
  get(datasetId: string): DatasetProfile | undefined;
  create(input: DatasetProfileInput): DatasetProfile;
  update(datasetId: string, updater: (current: DatasetProfile) => DatasetProfile): DatasetProfile | undefined;
}

export class FileDatasetRepository implements DatasetRepository {
  constructor(private readonly metadataPath: string) {
    ensureDirectory(metadataPath);
    if (!existsSync(metadataPath)) {
      writeFileSync(metadataPath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  private readAll(): DatasetProfile[] {
    try {
      const raw = readFileSync(this.metadataPath, 'utf8');
      if (!raw.trim()) return [];
      const data = JSON.parse(raw) as DatasetProfile[];
      return data;
    } catch (error) {
      console.error('[datasetRepository] Failed to read metadata', error);
      return [];
    }
  }

  private writeAll(profiles: DatasetProfile[]) {
    ensureDirectory(this.metadataPath);
    writeFileSync(this.metadataPath, JSON.stringify(profiles, null, 2), 'utf8');
  }

  list(): DatasetProfile[] {
    return this.readAll();
  }

  get(datasetId: string): DatasetProfile | undefined {
    return this.readAll().find((dataset) => dataset.datasetId === datasetId);
  }

  create(input: DatasetProfileInput): DatasetProfile {
    const now = new Date().toISOString();
    const dataset: DatasetProfile = {
      datasetId: randomUUID(),
      projectId: input.projectId,
      filename: input.filename,
      fileType: input.fileType,
      size: input.size,
      nRows: input.profile.nRows,
      nCols: input.profile.columns.length,
      columns: input.profile.columns,
      sample: input.profile.sample,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata
    };

    const all = this.readAll();
    all.push(dataset);
    this.writeAll(all);
    return dataset;
  }

  update(datasetId: string, updater: (current: DatasetProfile) => DatasetProfile): DatasetProfile | undefined {
    const all = this.readAll();
    const index = all.findIndex((dataset) => dataset.datasetId === datasetId);
    if (index === -1) return undefined;

    const current = all[index];
    const updated = updater(current);
    all[index] = { ...updated, datasetId: current.datasetId, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    this.writeAll(all);
    return all[index];
  }
}

export function createDatasetRepository(metadataPath: string): DatasetRepository {
  return new FileDatasetRepository(metadataPath);
}
