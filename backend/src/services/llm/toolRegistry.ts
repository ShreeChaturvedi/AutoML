export type LlmToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const LLM_TOOL_DEFINITIONS: LlmToolDefinition[] = [
  {
    name: 'list_project_files',
    description: 'List datasets and documents available for the project.',
    parameters: {}
  },
  {
    name: 'get_dataset_profile',
    description: 'Fetch full dataset profile (columns, dtypes, stats, sample).',
    parameters: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' }
      },
      required: ['datasetId']
    }
  },
  {
    name: 'get_dataset_sample',
    description: 'Fetch a small sample of dataset rows for inspection.',
    parameters: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' }
      },
      required: ['datasetId']
    }
  },
  {
    name: 'search_documents',
    description: 'Search uploaded documents for relevant context snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['query']
    }
  },
  {
    name: 'run_python',
    description: 'Execute Python code in the cloud runtime and return outputs.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        pythonVersion: { type: 'string', enum: ['3.10', '3.11'] },
        timeoutMs: { type: 'number' }
      },
      required: ['code']
    }
  }
];

export function buildToolDescriptionText(): string {
  return LLM_TOOL_DEFINITIONS.map((tool) => {
    const params = JSON.stringify(tool.parameters);
    return `- ${tool.name}(${params}): ${tool.description}`;
  }).join('\n');
}
