import { Router, type Response } from 'express';
import { z } from 'zod';

import { createDatasetRepository } from '../repositories/datasetRepository.js';
import { env } from '../config.js';
import { hasDatabaseConfiguration } from '../db.js';
import { searchDocuments } from '../services/documentSearchService.js';
import { FEATURE_METHODS } from '../services/featureEngineering.js';
import { createLlmClient, type LlmClient, type LlmRequest } from '../services/llm/llmClient.js';
import { buildFeatureEngineeringRequest, buildTrainingRequest, getJsonMarkers } from '../services/llm/prompts.js';
import { executeToolCall } from '../services/llm/tools.js';
import { LLM_TOOL_DEFINITIONS } from '../services/llm/toolRegistry.js';
import { LlmEnvelopeSchema, ToolCallSchema } from '../types/llm.js';

const datasetRepository = createDatasetRepository(env.datasetMetadataPath);

const toolResultSchema = z.object({
  id: z.string().min(1),
  tool: ToolCallSchema.shape.tool,
  output: z.unknown().optional(),
  error: z.string().optional()
});

const planSchema = z.object({
  projectId: z.string().min(1),
  datasetId: z.string().min(1),
  targetColumn: z.string().optional(),
  prompt: z.string().optional(),
  toolResults: z.array(toolResultSchema).optional(),
  featureSummary: z.string().optional()
});

const executeToolsSchema = z.object({
  projectId: z.string().min(1),
  toolCalls: z.array(ToolCallSchema)
});

export function createLlmRouter() {
  const router = Router();
  const llmClient = createLlmClient();

  router.post('/llm/tools/execute', async (req, res) => {
    const parsed = executeToolsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid tool payload', details: parsed.error.issues });
    }

    const { projectId, toolCalls } = parsed.data;
    const results = await Promise.all(toolCalls.map((call) => executeToolCall(projectId, call)));
    return res.json({ results });
  });

  router.get('/llm/tools', (_req, res) => {
    return res.json({ tools: LLM_TOOL_DEFINITIONS });
  });

  router.post('/llm/feature-plan/stream', async (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    }

    const dataset = await datasetRepository.getById(parsed.data.datasetId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const ragSnippets = await loadRagSnippets(parsed.data.projectId, parsed.data.prompt ?? dataset.filename);
    const request = buildFeatureEngineeringRequest({
      dataset,
      targetColumn: parsed.data.targetColumn,
      prompt: parsed.data.prompt,
      ragSnippets,
      toolResults: parsed.data.toolResults,
      featureMethods: [...FEATURE_METHODS]
    });

    await streamLlmResponse(res, llmClient, request);
  });

  router.post('/llm/training/stream', async (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    }

    const dataset = await datasetRepository.getById(parsed.data.datasetId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const ragSnippets = await loadRagSnippets(parsed.data.projectId, parsed.data.prompt ?? dataset.filename);
    const request = buildTrainingRequest({
      dataset,
      targetColumn: parsed.data.targetColumn,
      prompt: parsed.data.prompt,
      ragSnippets,
      toolResults: parsed.data.toolResults,
      featureSummary: parsed.data.featureSummary
    });

    await streamLlmResponse(res, llmClient, request);
  });

  return router;
}

async function loadRagSnippets(projectId: string, query: string) {
  if (!hasDatabaseConfiguration()) return [];
  if (!query.trim()) return [];
  const results = await searchDocuments({ projectId, query, limit: 4 });
  return results.map((result) => ({
    filename: result.filename,
    snippet: result.snippet
  }));
}

async function streamLlmResponse(res: Response, client: LlmClient, request: LlmRequest) {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { JSON_START, JSON_END } = getJsonMarkers();
  let fullText = '';
  let sentLength = 0;
  let jsonStartIndex = -1;

  const writeEvent = (payload: Record<string, unknown>) => {
    res.write(`${JSON.stringify(payload)}\n`);
  };

  try {
    await client.stream(request, {
      onToken: (token) => {
        fullText += token;

        if (jsonStartIndex === -1) {
          const markerIndex = fullText.indexOf(JSON_START);
          if (markerIndex !== -1) {
            const visible = fullText.slice(sentLength, markerIndex);
            if (visible) {
              writeEvent({ type: 'token', text: visible });
            }
            jsonStartIndex = markerIndex;
            sentLength = markerIndex;
          } else {
            const visible = fullText.slice(sentLength);
            if (visible) {
              writeEvent({ type: 'token', text: visible });
            }
            sentLength = fullText.length;
          }
        }
      }
    });

    console.log('[llm] Full LLM response:', fullText);

    const jsonStart = fullText.indexOf(JSON_START);
    const jsonEnd = fullText.indexOf(JSON_END, jsonStart + JSON_START.length);
    if (jsonStart === -1 || jsonEnd === -1) {
      console.log('[llm] Missing markers. JSON_START found:', jsonStart, 'JSON_END found:', jsonEnd);
      writeEvent({ type: 'error', message: 'LLM did not return a valid UI envelope.' });
      res.end();
      return;
    }

    const jsonPayload = fullText.slice(jsonStart + JSON_START.length, jsonEnd).trim();
    let envelope: unknown;
    try {
      envelope = JSON.parse(jsonPayload);
    } catch {
      writeEvent({ type: 'error', message: 'LLM returned invalid JSON.' });
      res.end();
      return;
    }

    const parsed = LlmEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      console.log('[llm] Envelope validation failed:', parsed.error.issues);
      writeEvent({ type: 'error', message: 'LLM envelope failed validation.' });
      res.end();
      return;
    }

    console.log('[llm] Envelope parsed successfully, sending to client');
    writeEvent({ type: 'envelope', envelope: parsed.data });
    writeEvent({ type: 'done' });
    res.end();
  } catch (error) {
    writeEvent({
      type: 'error',
      message: error instanceof Error ? error.message : 'LLM request failed'
    });
    res.end();
  }
}
