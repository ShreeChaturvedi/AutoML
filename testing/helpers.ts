import type { APIRequestContext } from '@playwright/test';

interface CreateProjectResponse {
  project: {
    id: string;
  };
}

export async function resetBackendData(request: APIRequestContext) {
  await request.delete('http://localhost:4000/api/projects/reset');
}

export async function apiCreateProject(request: APIRequestContext, payload: Record<string, unknown>) {
  const response = await request.post('http://localhost:4000/api/projects', {
    data: payload
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Project creation failed: ${response.status()} - ${text}`);
  }

  return (await response.json()) as CreateProjectResponse;
}
