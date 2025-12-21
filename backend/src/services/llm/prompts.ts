import type { DatasetProfile } from '../../types/dataset.js';
import type { FeatureMethod } from '../featureEngineering.js';
import type { LlmRequest } from './llmClient.js';
import type { ToolResult } from '../../types/llm.js';

const JSON_START = '<<<JSON>>>';
const JSON_END = '<<<END>>>';

export function getJsonMarkers() {
  return { JSON_START, JSON_END };
}

const TOOL_DESCRIPTIONS = `
Tools you can request (only when you must):
- list_project_files(): list datasets/documents for the project.
- get_dataset_profile({ datasetId }): returns columns, dtypes, stats, sample.
- get_dataset_sample({ datasetId }): returns sample rows.
- search_documents({ query, limit? }): returns top document chunks relevant to query.
- run_python({ code, pythonVersion?, timeoutMs? }): executes code in cloud runtime.
`.trim();

const UI_SCHEMA = `
UI JSON schema (use only these types):
{
  "version": "1",
  "kind": "feature_engineering" | "training",
  "title": string?,
  "summary": string?,
  "sections": [
    {
      "id": string,
      "title": string?,
      "layout": "grid" | "column" | "row"?,
      "columns": number?,
      "items": UIItem[]
    }
  ]
}

UIItem types:
- dataset_summary: { "type": "dataset_summary", "datasetId": string, "filename": string, "rows": number, "columns": number, "notes"?: string[] }
- feature_suggestion: { "type": "feature_suggestion", "id": string, "feature": FeatureSpec, "rationale": string, "impact": "high"|"medium"|"low", "controls"?: Control[] }
- model_recommendation: { "type": "model_recommendation", "id": string, "template": ModelTemplate, "parameters": object, "rationale": string }
- code_cell: { "type": "code_cell", "id": string, "title"?: string, "language": "python", "content": string, "autoRun"?: boolean }
- action: { "type": "action", "id": string, "label": string, "actionType": "insert_code_cell"|"apply_features"|"train_model", "payload"?: object }
- callout: { "type": "callout", "tone": "info"|"warning"|"success", "text": string }

Control:
{ "key": string, "label": string, "type": "number"|"boolean"|"select"|"text"|"column", "value": any, "min"?: number, "max"?: number, "step"?: number, "options"?: { "value": string, "label": string }[] }

FeatureSpec:
{ "sourceColumn": string, "secondaryColumn"?: string, "featureName": string, "description"?: string, "method": string, "params"?: object }

ModelTemplate:
{ "name": string, "taskType": "classification"|"regression"|"clustering", "library": string, "importPath": string, "modelClass": string, "parameters": [{ "key": string, "label": string, "type": "number"|"string"|"boolean"|"select", "default": any, "min"?: number, "max"?: number, "step"?: number, "options"?: { "value": string, "label": string }[] }], "metrics": string[] }
`.trim();

const OUTPUT_RULES = `
Output format (STRICT - follow exactly):
1) Short assistant text (1-3 sentences).
2) Then output EXACTLY: ${JSON_START}
3) Then output valid JSON (the envelope object).
4) Then output EXACTLY: ${JSON_END}
5) Do not output anything after ${JSON_END}.

CRITICAL: Do NOT use markdown code blocks (\`\`\`json). Use ONLY ${JSON_START} and ${JSON_END} as delimiters.

Envelope JSON schema (MUST follow this exactly):
{
  "version": "1",
  "kind": "feature_engineering" | "training",
  "message": string?,
  "tool_calls": [{ "id": string, "tool": string, "args": object, "rationale"?: string }]?,
  "ui": {
    "version": "1",
    "kind": "feature_engineering" | "training",
    "title": string?,
    "summary": string?,
    "sections": UISection[]
  } | null
}

IMPORTANT: The "ui" field must be an object containing the UI schema. Do NOT put title/summary/sections at the root level.

Example:
${JSON_START}
{"version":"1","kind":"training","ui":{"version":"1","kind":"training","title":"My Plan","sections":[...]}}
${JSON_END}

If you need tools, set ui to null and include tool_calls.
If tool_calls is empty or omitted, ui must be present.
`.trim();

function buildSystemPrompt() {
  return [
    'You are an AutoML workflow designer.',
    'Generate deterministic-looking UI plans driven by data context.',
    TOOL_DESCRIPTIONS,
    UI_SCHEMA,
    OUTPUT_RULES
  ].join('\n\n');
}

export function buildFeatureEngineeringRequest(params: {
  dataset: DatasetProfile;
  targetColumn?: string;
  prompt?: string;
  ragSnippets?: Array<{ filename: string; snippet: string }>;
  toolResults?: ToolResult[];
  featureMethods: FeatureMethod[];
}): LlmRequest {
  const { dataset, targetColumn, prompt, ragSnippets, toolResults, featureMethods } = params;

  const userContent = [
    `Goal: Generate a feature engineering plan and UI for dataset "${dataset.filename}".`,
    prompt ? `User intent: ${prompt}` : 'User intent: (not provided)',
    `Target column: ${targetColumn ?? 'unspecified'}`,
    `Dataset summary: ${dataset.nRows} rows, ${dataset.nCols} columns.`,
    `Columns: ${dataset.columns.map((column) => `${column.name} (${column.dtype})`).join(', ')}`,
    dataset.sample?.length
      ? `Sample rows: ${JSON.stringify(dataset.sample.slice(0, 5))}`
      : 'Sample rows: (none)',
    ragSnippets?.length
      ? `RAG snippets:\n${ragSnippets.map((doc, idx) => `${idx + 1}. ${doc.filename}: ${doc.snippet}`).join('\n')}`
      : 'RAG snippets: (none)',
    toolResults?.length
      ? `Tool results:\n${JSON.stringify(toolResults, null, 2)}`
      : 'Tool results: (none)',
    `Supported feature methods: ${featureMethods.join(', ')}.`,
    'Return UI that lets users enable/disable suggestions, tune controls, and insert code cells.'
  ].join('\n');

  return {
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3,
    maxOutputTokens: 2048
  };
}

export function buildTrainingRequest(params: {
  dataset: DatasetProfile;
  targetColumn?: string;
  prompt?: string;
  ragSnippets?: Array<{ filename: string; snippet: string }>;
  toolResults?: ToolResult[];
  featureSummary?: string;
}): LlmRequest {
  const { dataset, targetColumn, prompt, ragSnippets, toolResults, featureSummary } = params;

  const userContent = [
    `Goal: Recommend training approach for dataset "${dataset.filename}".`,
    prompt ? `User intent: ${prompt}` : 'User intent: (not provided)',
    `Target column: ${targetColumn ?? 'unspecified'}`,
    `Dataset summary: ${dataset.nRows} rows, ${dataset.nCols} columns.`,
    `Columns: ${dataset.columns.map((column) => `${column.name} (${column.dtype})`).join(', ')}`,
    dataset.sample?.length
      ? `Sample rows: ${JSON.stringify(dataset.sample.slice(0, 5))}`
      : 'Sample rows: (none)',
    featureSummary ? `Feature engineering context: ${featureSummary}` : 'Feature engineering context: (none)',
    ragSnippets?.length
      ? `RAG snippets:\n${ragSnippets.map((doc, idx) => `${idx + 1}. ${doc.filename}: ${doc.snippet}`).join('\n')}`
      : 'RAG snippets: (none)',
    toolResults?.length
      ? `Tool results:\n${JSON.stringify(toolResults, null, 2)}`
      : 'Tool results: (none)',
    'Return UI with model recommendations, parameters, and code cells where needed.'
  ].join('\n');

  return {
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3,
    maxOutputTokens: 2048
  };
}
