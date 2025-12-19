/**
 * Execution API Client
 * 
 * API client for cloud (Docker) code execution.
 */

import { apiRequest } from './client';
import type { ExecutionResult, PythonVersion, PackageInfo } from '../pyodide/types';

export interface ExecuteRequest {
    projectId: string;
    code: string;
    sessionId?: string;
    pythonVersion?: PythonVersion;
    timeout?: number;
}

export interface SessionInfo {
    id: string;
    projectId: string;
    pythonVersion: PythonVersion;
    installedPackages: PackageInfo[];
    createdAt: string;
    lastUsedAt: string;
}

export interface RuntimeInfo {
    pythonVersion: PythonVersion;
    available: boolean;
    dockerEnabled: boolean;
}

/**
 * Execute code via cloud runtime (Docker)
 */
export async function executeCode(request: ExecuteRequest): Promise<ExecutionResult> {
    const response = await apiRequest<{ success: boolean; result: ExecutionResult }>(
        '/execute',
        {
            method: 'POST',
            body: JSON.stringify(request)
        }
    );
    return response.result;
}

/**
 * Create a new execution session
 */
export async function createSession(
    projectId: string,
    pythonVersion?: PythonVersion
): Promise<SessionInfo> {
    const response = await apiRequest<{ success: boolean; session: SessionInfo }>(
        '/execute/session',
        {
            method: 'POST',
            body: JSON.stringify({ projectId, pythonVersion })
        }
    );
    return response.session;
}

/**
 * Get session details
 */
export async function getSession(sessionId: string): Promise<SessionInfo | null> {
    try {
        const response = await apiRequest<{ session: SessionInfo }>(
            `/execute/session/${sessionId}`
        );
        return response.session;
    } catch {
        return null;
    }
}

/**
 * Destroy a session
 */
export async function destroySession(sessionId: string): Promise<void> {
    await apiRequest(`/execute/session/${sessionId}`, { method: 'DELETE' });
}

/**
 * Install a package in a session
 */
export async function installPackage(
    sessionId: string,
    packageName: string
): Promise<{ success: boolean; message: string }> {
    return apiRequest('/execute/packages', {
        method: 'POST',
        body: JSON.stringify({ sessionId, packageName })
    });
}

/**
 * List installed packages in a session
 */
export async function listPackages(sessionId: string): Promise<PackageInfo[]> {
    const response = await apiRequest<{ packages: PackageInfo[] }>(
        `/execute/packages/${sessionId}`
    );
    return response.packages;
}

/**
 * Search PyPI packages for autocomplete
 */
export async function searchPackages(
    query: string,
    limit = 8
): Promise<PackageInfo[]> {
    const params = new URLSearchParams();
    if (query) {
        params.set('q', query);
    }
    params.set('limit', `${limit}`);

    const response = await apiRequest<{ suggestions: PackageInfo[] }>(
        `/execute/packages/suggest?${params.toString()}`
    );
    return response.suggestions;
}

/**
 * Get available Python runtimes
 */
export async function getRuntimes(): Promise<RuntimeInfo[]> {
    const response = await apiRequest<{ runtimes: RuntimeInfo[] }>(
        '/execute/runtimes'
    );
    return response.runtimes;
}

/**
 * Check execution service health
 */
export async function getExecutionHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'error';
    dockerAvailable: boolean;
    activeSessions: number;
}> {
    try {
        return await apiRequest('/execute/health');
    } catch {
        return {
            status: 'error',
            dockerAvailable: false,
            activeSessions: 0
        };
    }
}
