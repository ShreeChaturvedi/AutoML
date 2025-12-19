/**
 * Pyodide Types
 * 
 * Shared types for the Pyodide execution client.
 */

export type ExecutionMode = 'browser' | 'cloud';
export type PythonVersion = '3.10' | '3.11';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'timeout';

export interface RichOutput {
    type: 'text' | 'table' | 'image' | 'html' | 'error' | 'chart';
    content: string;
    data?: unknown;
    mimeType?: string;
}

export interface ExecutionResult {
    status: ExecutionStatus;
    stdout: string;
    stderr: string;
    outputs: RichOutput[];
    executionMs: number;
    error?: string;
    cached?: boolean;
}

export interface PackageInfo {
    name: string;
    version?: string;
    summary?: string;
    homepage?: string;
}

export interface PackageInstallEvent {
    type: 'progress' | 'log' | 'done';
    progress?: number;
    stage?: string;
    message?: string;
    success?: boolean;
}

export interface RuntimeInfo {
    mode: ExecutionMode;
    pythonVersion: PythonVersion;
    ready: boolean;
    initializing: boolean;
    progress: number;
    statusMessage: string;
    dockerAvailable?: boolean;
}
