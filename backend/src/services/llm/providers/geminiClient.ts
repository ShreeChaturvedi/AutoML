import type { LlmClient, LlmRequest } from '../llmClient.js';

interface GeminiClientOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class GeminiClient implements LlmClient {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: GeminiClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
  }

  async complete(request: LlmRequest): Promise<string> {
    const body = buildGeminiBody(request);
    const response = await this.fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Gemini request failed (${response.status})`);
    }

    const payload = await response.json();
    return extractGeminiText(payload);
  }

  async stream(request: LlmRequest, handlers: { onToken: (token: string) => void }): Promise<string> {
    const body = buildGeminiBody(request);
    const response = await this.fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Gemini stream failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Handle SSE format: data: {...}
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const chunk = extractGeminiText(json);
          if (chunk) {
            fullText += chunk;
            handlers.onToken(chunk);
          }
        } catch {
          // Ignore malformed chunks.
        }
      }
    }

    if (buffer.trim()) {
      const tail = buffer.trim();
      if (tail.startsWith('data:')) {
        const data = tail.slice(5).trim();
        if (data && data !== '[DONE]') {
          try {
            const json = JSON.parse(data);
            const chunk = extractGeminiText(json);
            if (chunk) {
              fullText += chunk;
              handlers.onToken(chunk);
            }
          } catch {
            // Ignore malformed tail.
          }
        }
      }
    }

    return fullText;
  }

  private async fetchWithTimeout(input: string, init: RequestInit) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is missing. Set GEMINI_API_KEY or LLM_API_KEY.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildGeminiBody(request: LlmRequest) {
  const system = request.messages.find((msg) => msg.role === 'system');
  const contents = request.messages
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  return {
    contents,
    systemInstruction: system ? { parts: [{ text: system.content }] } : undefined,
    generationConfig: {
      temperature: request.temperature ?? 0.3,
      maxOutputTokens: request.maxOutputTokens ?? 2048,
      responseMimeType: request.responseMimeType
    }
  };
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
  if (!Array.isArray(candidates)) return '';
  const parts = candidates.flatMap((candidate) => candidate.content?.parts ?? []);
  return parts.map((part) => part.text ?? '').join('');
}
