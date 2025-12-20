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
  parseError?: string;
}

export async function parseDocument(buffer: Buffer, mimeType?: string): Promise<ParsedDocument> {
  if (mimeType?.includes('pdf')) {
    const { text, parseError } = await parsePdfBuffer(buffer);
    return {
      text,
      mimeType: mimeType ?? 'application/pdf',
      type: 'pdf',
      parseError
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
async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; parseError?: string }> {
  const primaryAttempt = await parsePdfWithPdfParse(buffer).catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[documentParser] PDFParse failed:', message);
    return { text: '', parseError: message };
  });

  if (primaryAttempt.text) {
    return primaryAttempt;
  }

  const fallbackAttempt = await parsePdfWithPdfjs(buffer).catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[documentParser] PDF.js fallback failed:', message);
    return { text: '', parseError: message };
  });

  if (fallbackAttempt.text) {
    return fallbackAttempt;
  }

  return {
    text: '',
    parseError: primaryAttempt.parseError || fallbackAttempt.parseError || 'No text extracted from PDF'
  };
}

async function parsePdfWithPdfParse(buffer: Buffer): Promise<{ text: string; parseError?: string }> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text ?? '' };
  } finally {
    await parser.destroy();
  }
}

async function parsePdfWithPdfjs(buffer: Buffer): Promise<{ text: string; parseError?: string }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
  const doc = await loadingTask.promise;
  let text = '';

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ');
      text += `${pageText}\n`;
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return { text: text.trim() };
}
