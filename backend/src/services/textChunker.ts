import type { ParsedDocument } from './documentParser.js';

export interface TextChunk {
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  tokenCount: number;
}

export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export function chunkDocument(doc: ParsedDocument, options: ChunkOptions): TextChunk[] {
  const content = normalizeWhitespace(doc.text);
  if (!content.trim()) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const chunkSize = Math.max(50, options.chunkSize);
  const overlap = Math.min(Math.floor(chunkSize / 2), Math.max(0, options.overlap));

  let index = 0;
  let chunkIndex = 0;

  while (index < content.length) {
    const end = Math.min(content.length, index + chunkSize);
    const chunkText = content.slice(index, end);
    chunks.push({
      chunkIndex,
      startOffset: index,
      endOffset: end,
      text: chunkText,
      tokenCount: estimateTokenCount(chunkText)
    });
    chunkIndex += 1;
    if (end >= content.length) {
      break;
    }
    index = end - overlap;
    if (index < 0) {
      index = 0;
    }
  }

  return chunks;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function estimateTokenCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
