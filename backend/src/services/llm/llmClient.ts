import { env } from '../../config.js';
import { GeminiClient } from './providers/geminiClient.js';
import { OpenAiClient } from './providers/openaiClient.js';

export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

export interface LlmClient {
  complete(request: LlmRequest): Promise<string>;
  stream(request: LlmRequest, handlers: { onToken: (token: string) => void }): Promise<string>;
}

export function createLlmClient(): LlmClient {
  const provider = env.llmProvider.toLowerCase();

  if (provider === 'openai') {
    return new OpenAiClient({
      apiKey: env.llmApiKey,
      baseUrl: env.llmBaseUrl,
      model: env.llmModel,
      timeoutMs: env.llmTimeoutMs
    });
  }

  return new GeminiClient({
    apiKey: env.geminiApiKey || env.llmApiKey,
    model: env.geminiModel || env.llmModel,
    timeoutMs: env.llmTimeoutMs
  });
}
