import { getDbPool, hasDatabaseConfiguration } from '../../db.js';
import { createDatasetRepository } from '../../repositories/datasetRepository.js';
import { env } from '../../config.js';
import { executeCode } from '../executionService.js';
import { searchDocuments } from '../documentSearchService.js';
import type { ToolCall, ToolResult } from '../../types/llm.js';

const datasetRepository = createDatasetRepository(env.datasetMetadataPath);

export async function executeToolCall(projectId: string, call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.tool) {
      case 'list_project_files':
        return { id: call.id, tool: call.tool, output: await listProjectFiles(projectId) };
      case 'get_dataset_profile':
        return { id: call.id, tool: call.tool, output: await getDatasetProfile(call.args) };
      case 'get_dataset_sample':
        return { id: call.id, tool: call.tool, output: await getDatasetSample(call.args) };
      case 'search_documents':
        return { id: call.id, tool: call.tool, output: await searchProjectDocuments(projectId, call.args) };
      case 'run_python':
        return { id: call.id, tool: call.tool, output: await runPython(projectId, call.args) };
      default:
        return { id: call.id, tool: call.tool, output: null, error: 'Unsupported tool' };
    }
  } catch (error) {
    return {
      id: call.id,
      tool: call.tool,
      output: null,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    };
  }
}

async function listProjectFiles(projectId: string) {
  const datasets = (await datasetRepository.list()).filter((dataset) => dataset.projectId === projectId);
  const documents = await listDocuments(projectId);

  return {
    datasets: datasets.map((dataset) => ({
      datasetId: dataset.datasetId,
      filename: dataset.filename,
      nRows: dataset.nRows,
      nCols: dataset.nCols,
      columns: dataset.columns.map((column) => column.name)
    })),
    documents: documents.map((doc) => ({
      documentId: doc.documentId,
      filename: doc.filename,
      mimeType: doc.mimeType
    }))
  };
}

async function listDocuments(projectId: string) {
  if (!hasDatabaseConfiguration()) return [];
  const pool = getDbPool();
  const result = await pool.query(
    `SELECT document_id, filename, mime_type FROM documents WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows.map((row) => ({
    documentId: row.document_id,
    filename: row.filename,
    mimeType: row.mime_type
  }));
}

async function getDatasetProfile(args: ToolCall['args']) {
  const datasetId = typeof args?.datasetId === 'string' ? args.datasetId : '';
  if (!datasetId) {
    throw new Error('datasetId is required');
  }
  const dataset = await datasetRepository.getById(datasetId);
  if (!dataset) {
    throw new Error('Dataset not found');
  }
  return dataset;
}

async function getDatasetSample(args: ToolCall['args']) {
  const datasetId = typeof args?.datasetId === 'string' ? args.datasetId : '';
  if (!datasetId) {
    throw new Error('datasetId is required');
  }
  const dataset = await datasetRepository.getById(datasetId);
  if (!dataset) {
    throw new Error('Dataset not found');
  }
  return {
    datasetId: dataset.datasetId,
    filename: dataset.filename,
    sample: dataset.sample
  };
}

async function searchProjectDocuments(projectId: string, args: ToolCall['args']) {
  if (!hasDatabaseConfiguration()) {
    throw new Error('Document search is unavailable without database configuration.');
  }
  const query = typeof args?.query === 'string' ? args.query : '';
  if (!query.trim()) {
    throw new Error('query is required');
  }
  const limit = Number.isFinite(args?.limit as number) ? Number(args?.limit) : 5;
  const results = await searchDocuments({
    projectId,
    query,
    limit: Math.min(10, Math.max(1, limit))
  });
  return results;
}

async function runPython(projectId: string, args: ToolCall['args']) {
  const code = typeof args?.code === 'string' ? args.code : '';
  if (!code.trim()) {
    throw new Error('code is required');
  }
  const pythonVersion = typeof args?.pythonVersion === 'string' ? args.pythonVersion : undefined;
  const timeout = Number.isFinite(args?.timeoutMs as number) ? Number(args?.timeoutMs) : undefined;
  const result = await executeCode({
    projectId,
    code,
    pythonVersion: pythonVersion === '3.10' ? '3.10' : '3.11',
    timeout
  });
  return result;
}
