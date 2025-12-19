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
    const text = await parsePdfBuffer(buffer);
    return {
      text,
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

/**
 * Parse PDF buffer using pdf-parse v2 API
 * pdf-parse v2 exports PDFParse class that needs to be instantiated
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2 exports PDFParse class
    const { PDFParse } = await import('pdf-parse');

    // Create parser instance with the buffer data
    const parser = new PDFParse({ data: buffer });

    // Get text content from PDF
    const result = await parser.getText();

    // Cleanup
    await parser.destroy();

    // result.text contains the full document text
    return result.text ?? '';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[documentParser] PDF parsing failed:', message);
    throw new Error(`Failed to parse PDF: ${message}`);
  }
}
