import { apiRequest, getApiBaseUrl } from './client';

export interface DocumentUploadResponse {
  document: {
    documentId: string;
    projectId: string;
    filename: string;
    mimeType: string;
    chunkCount: number;
    embeddingDimension: number;
  };
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface AnswerCitation {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
}

export interface AnswerResponse {
  answer: {
    status: 'ok' | 'no_chunks' | 'error';
    answer: string;
    citations: AnswerCitation[];
    cached: boolean;
    cacheTimestamp?: string;
  };
}

export async function uploadDocument(projectId: string, file: File): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);

  const response = await fetch(`${getApiBaseUrl()}/upload/doc`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const message = response.statusText || 'Document upload failed';
    throw new Error(message);
  }

  return response.json() as Promise<DocumentUploadResponse>;
}

export async function searchDocuments(
  projectId: string,
  query: string,
  topK: number = 5
): Promise<{ results: SearchResult[] }> {
  return apiRequest(`/docs/search?projectId=${projectId}&q=${encodeURIComponent(query)}&k=${topK}`, {
    method: 'GET'
  });
}

export async function getAnswer(
  projectId: string,
  question: string,
  topK: number = 3
): Promise<AnswerResponse> {
  return apiRequest('/answer', {
    method: 'POST',
    body: JSON.stringify({ projectId, question, topK })
  });
}
