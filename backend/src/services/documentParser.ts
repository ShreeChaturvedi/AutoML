const MIME_TEXT = new Set([
  'text/plain',
  'text/markdown',
  'text/md',
  'text/x-markdown',
  'text/html',
  'application/json'
]);

export type SupportedDocumentType = 'pdf' | 'markdown' | 'text' | 'unknown';

export interface ParsedDocument {
  text: string;
  mimeType: string;
  type: SupportedDocumentType;
}

export async function parseDocument(buffer: Buffer, mimeType?: string): Promise<ParsedDocument> {
  if (mimeType?.includes('pdf')) {
    const parser = await resolvePdfParser();
    const parsed = await parser(buffer);
    return {
      text: parsed.text ?? '',
      mimeType: mimeType ?? 'application/pdf',
      type: 'pdf'
    };
  }

  if (mimeType && MIME_TEXT.has(mimeType)) {
    return {
      text: buffer.toString('utf8'),
      mimeType,
      type: mimeType.includes('markdown') ? 'markdown' : 'text'
    };
  }

  // Fallback: try to decode as UTF-8 text
  const text = buffer.toString('utf8');
  return {
    text,
    mimeType: mimeType ?? 'text/plain',
    type: text ? 'text' : 'unknown'
  };
}

type PdfParser = (data: Buffer | Uint8Array, options?: unknown) => Promise<{ text?: string }>;

async function resolvePdfParser(): Promise<PdfParser> {
  const pdfModule = (await import('pdf-parse')) as unknown as PdfParser & { default?: PdfParser };
  return pdfModule.default ?? (pdfModule as PdfParser);
}
