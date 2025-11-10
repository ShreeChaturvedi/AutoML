const BASE_URL = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api').replace(/\/$/, '');

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends Omit<RequestInit, 'method'> {
  method?: HttpMethod;
  parseJson?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  const isJsonString = typeof options.body === 'string';
  if (!headers.has('Content-Type') && isJsonString) {
    headers.set('Content-Type', 'application/json');
  }

  const requestInit: RequestInit = {
    ...options,
    method,
    headers
  };

  console.info(`[frontend api] ${method} ${url}`);

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text();
    }
    throw new ApiError(`Request to ${url} failed with status ${response.status}`, response.status, payload);
  }

  if (options.parseJson === false || response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export function getApiBaseUrl() {
  return BASE_URL;
}
