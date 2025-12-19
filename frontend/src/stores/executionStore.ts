/**
 * Execution Store
 * 
 * Zustand store for managing Python code execution state.
 * Supports both browser (Pyodide) and cloud (Docker) execution modes.
 */

import { create } from 'zustand';
import type { ExecutionMode, PythonVersion, ExecutionResult, PackageInfo } from '@/lib/pyodide/types';
import {
    loadPyodide,
    isPyodideReady,
    executePython,
    installPackage as pyodideInstallPackage,
    getInstalledPackages as getPyodidePackages,
    mountDataset
} from '@/lib/pyodide/pyodideClient';
import * as executionApi from '@/lib/api/execution';

interface ExecutionState {
    // Runtime configuration
    mode: ExecutionMode;
    pythonVersion: PythonVersion;

    // Pyodide state
    pyodideReady: boolean;
    pyodideInitializing: boolean;
    pyodideProgress: number;
    pyodideStatusMessage: string;

    // Cloud state
    cloudAvailable: boolean;
    cloudInitializing: boolean;
    sessionId: string | null;

    // Package management
    installedPackages: PackageInfo[];
    installingPackage: boolean;

    // Execution state
    isExecuting: boolean;
    lastResult: ExecutionResult | null;

    // Actions
    setMode: (mode: ExecutionMode) => void;
    setPythonVersion: (version: PythonVersion) => void;
    initializePyodide: () => Promise<void>;
    initializeCloud: (projectId: string) => Promise<void>;
    executeCode: (code: string, projectId: string) => Promise<ExecutionResult>;
    installPackage: (packageName: string, projectId?: string) => Promise<{ success: boolean; message: string }>;
    refreshPackages: () => Promise<void>;
    mountDatasetFile: (filename: string, content: ArrayBuffer | string) => Promise<void>;
    checkCloudHealth: () => Promise<void>;
    reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
    // Initial state
    mode: 'browser',
    pythonVersion: '3.11',
    pyodideReady: false,
    pyodideInitializing: false,
    pyodideProgress: 0,
    pyodideStatusMessage: '',
    cloudAvailable: false,
    cloudInitializing: false,
    sessionId: null,
    installedPackages: [],
    installingPackage: false,
    isExecuting: false,
    lastResult: null,

    setMode: (mode) => {
        set({ mode });
        // If switching to cloud, check availability
        if (mode === 'cloud') {
            get().checkCloudHealth();
        }
    },

    setPythonVersion: (pythonVersion) => {
        set({ pythonVersion });
        // Clear session when changing Python version
        if (get().sessionId) {
            set({ sessionId: null });
        }
    },

    initializePyodide: async () => {
        if (get().pyodideReady || get().pyodideInitializing) {
            return;
        }

        set({ pyodideInitializing: true, pyodideProgress: 0 });

        try {
            await loadPyodide((progress, message) => {
                set({ pyodideProgress: progress, pyodideStatusMessage: message });
            });

            const packages = await getPyodidePackages();
            set({
                pyodideReady: true,
                pyodideInitializing: false,
                pyodideProgress: 100,
                pyodideStatusMessage: 'Ready',
                installedPackages: packages
            });

            console.log('[executionStore] Pyodide initialized successfully');
        } catch (error) {
            console.error('[executionStore] Pyodide initialization failed:', error);
            set({
                pyodideInitializing: false,
                pyodideProgress: 0,
                pyodideStatusMessage: 'Failed to initialize'
            });
            throw error;
        }
    },

    initializeCloud: async (projectId) => {
        const { pythonVersion, cloudAvailable: isCloudAvailable } = get();
        if (get().cloudInitializing) {
            return;
        }

        set({ cloudInitializing: true });

        try {
            const session = await Promise.race([
                executionApi.createSession(projectId, pythonVersion),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Cloud runtime initialization timed out.')), 120000)
                )
            ]);
            set({
                sessionId: session.id,
                installedPackages: session.installedPackages ?? [],
                cloudAvailable: true,
                cloudInitializing: false
            });

            console.log('[executionStore] Cloud session created:', session.id);
        } catch (error) {
            console.error('[executionStore] Cloud initialization failed:', error);
            set({
                cloudAvailable: isCloudAvailable,
                cloudInitializing: false,
                sessionId: null
            });
            throw error;
        }
    },

    executeCode: async (code, projectId) => {
        const { mode, sessionId, pythonVersion, pyodideReady } = get();

        set({ isExecuting: true, lastResult: null });

        try {
            let result: ExecutionResult;

            if (mode === 'browser') {
                // Ensure Pyodide is ready
                if (!pyodideReady) {
                    await get().initializePyodide();
                }

                result = await executePython(code);
            } else {
                if (!sessionId) {
                    await get().initializeCloud(projectId);
                }

                const activeSessionId = get().sessionId;
                if (!activeSessionId) {
                    throw new Error('Cloud runtime session is unavailable.');
                }

                result = await executionApi.executeCode({
                    projectId,
                    code,
                    sessionId: activeSessionId,
                    pythonVersion
                });
            }

            set({ lastResult: result, isExecuting: false });
            return result;
        } catch (error) {
            const errorResult: ExecutionResult = {
                status: 'error',
                stdout: '',
                stderr: error instanceof Error ? error.message : 'Unknown error',
                outputs: [{
                    type: 'error' as const,
                    content: error instanceof Error ? error.message : 'Execution failed'
                }],
                executionMs: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };

            set({ lastResult: errorResult, isExecuting: false });
            return errorResult;
        }
    },

    installPackage: async (packageName, projectId) => {
        const { mode, sessionId } = get();

        set({ installingPackage: true });

        try {
            let result: { success: boolean; message: string };

            if (mode === 'browser') {
                result = await pyodideInstallPackage(packageName);
                if (result.success) {
                    set({ installedPackages: await getPyodidePackages() });
                }
            } else {
                if (!sessionId && projectId) {
                    await get().initializeCloud(projectId);
                }

                const activeSessionId = get().sessionId;
                if (!activeSessionId) {
                    result = { success: false, message: 'No active cloud session' };
                } else {
                    result = await executionApi.installPackage(activeSessionId, packageName);
                    if (result.success) {
                        const packages = await executionApi.listPackages(activeSessionId);
                        set({ installedPackages: packages });
                    }
                }
            }

            set({ installingPackage: false });
            return result;
        } catch (error) {
            set({ installingPackage: false });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to install package'
            };
        }
    },

    refreshPackages: async () => {
        const { mode, sessionId } = get();

        if (mode === 'browser') {
            set({ installedPackages: await getPyodidePackages() });
            return;
        }

        if (!sessionId) {
            return;
        }

        try {
            const packages = await executionApi.listPackages(sessionId);
            set({ installedPackages: packages });
        } catch (error) {
            console.error('[executionStore] Failed to refresh packages:', error);
        }
    },

    mountDatasetFile: async (filename, content) => {
        const { mode } = get();

        if (mode === 'browser') {
            await mountDataset(filename, content);
        }
        // For cloud mode, datasets are mounted automatically via Docker volumes
    },

    checkCloudHealth: async () => {
        try {
            const health = await executionApi.getExecutionHealth();
            set({ cloudAvailable: health.dockerAvailable });
        } catch {
            set({ cloudAvailable: false });
        }
    },

    reset: () => {
        set({
            mode: 'browser',
            pythonVersion: '3.11',
            sessionId: null,
            installedPackages: [],
            cloudInitializing: false,
            isExecuting: false,
            lastResult: null
        });
        if (isPyodideReady()) {
            void getPyodidePackages().then((packages) => set({ installedPackages: packages }));
        }
    }
}));
