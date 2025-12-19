/**
 * Pyodide Client
 * 
 * Browser-based Python execution via Pyodide (WebAssembly).
 * Provides in-browser code execution with ML libraries support.
 */

import type { RichOutput, ExecutionResult, PackageInfo } from './types';

// Pyodide types (loaded dynamically)
type PyodideInterface = {
    runPythonAsync: (code: string) => Promise<unknown>;
    loadPackage: (packages: string | string[]) => Promise<void>;
    FS: {
        writeFile: (path: string, data: string | Uint8Array) => void;
        readFile: (path: string, options?: { encoding: string }) => string | Uint8Array;
        mkdir: (path: string) => void;
        readdir: (path: string) => string[];
    };
    globals: {
        get: (name: string) => unknown;
        set: (name: string, value: unknown) => void;
    };
};

type LoadPyodide = (config: {
    indexURL: string;
    stdout?: (msg: string) => void;
    stderr?: (msg: string) => void;
}) => Promise<PyodideInterface>;

// CDN URL for Pyodide
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/';

// Singleton instance
let pyodideInstance: PyodideInterface | null = null;
let initPromise: Promise<PyodideInterface> | null = null;
const loadedPackages: Set<string> = new Set();
const BROWSER_UNSUPPORTED_PACKAGES = new Set([
    'torch',
    'pytorch',
    'torchvision',
    'torchaudio',
    'tensorflow',
    'jax',
    'jaxlib',
    'xgboost',
    'lightgbm',
    'catboost',
    'opencv-python',
    'pyspark',
    'prophet'
]);

// Progress callback type
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Load the Pyodide runtime
 */
export async function loadPyodide(onProgress?: ProgressCallback): Promise<void> {
    if (pyodideInstance) {
        onProgress?.(100, 'Ready');
        return;
    }

    if (initPromise) {
        await initPromise;
        onProgress?.(100, 'Ready');
        return;
    }

    initPromise = (async () => {
        onProgress?.(5, 'Loading Pyodide runtime...');

        // Dynamically load the Pyodide script
        const restoreAmd = disableAmdLoader();
        try {
            await loadScript(`${PYODIDE_CDN}pyodide.js`);
        } finally {
            restoreAmd();
        }

        onProgress?.(20, 'Initializing Python...');

        // Get the loadPyodide function from window
        const loadPyodideFn = (window as unknown as { loadPyodide: LoadPyodide }).loadPyodide;

        const pyodide = await loadPyodideFn({
            indexURL: PYODIDE_CDN,
            stdout: () => { /* output captured in Python */ },
            stderr: () => { /* errors captured in Python */ }
        });

        onProgress?.(50, 'Loading core packages...');

        // Pre-load essential packages
        await pyodide.loadPackage(['numpy', 'pandas']);
        loadedPackages.add('numpy');
        loadedPackages.add('pandas');

        onProgress?.(80, 'Setting up environment...');

        // Create workspace directories in virtual filesystem
        try {
            pyodide.FS.mkdir('/workspace');
            pyodide.FS.mkdir('/workspace/datasets');
        } catch {
            // Directories may already exist
        }

        // Set up Python helpers
        await pyodide.runPythonAsync(`
import sys
import json
import io
import builtins
from pathlib import Path

# Save the REAL print before anything can override it
_builtin_print = builtins.print

# Output capture helper
class OutputCapture:
    def __init__(self):
        self.outputs = []
        
    def capture_print(self, *args, **kwargs):
        # Remove file from kwargs if present to avoid conflict
        kwargs.pop('file', None)
        output = io.StringIO()
        _builtin_print(*args, file=output, **kwargs)
        self.outputs.append({"type": "text", "content": output.getvalue()})
        # Also write to real stdout using the saved builtin
        _builtin_print(*args, file=sys.stdout, **kwargs)
    
    def display_df(self, df, max_rows=20):
        """Display DataFrame as table output"""
        if hasattr(df, 'to_dict'):
            data = df.head(max_rows).to_dict('records')
            cols = list(df.columns)
            self.outputs.append({
                "type": "table",
                "content": f"DataFrame ({len(df)} rows, {len(cols)} cols)",
                "data": {"columns": cols, "rows": data}
            })
    
    def get_outputs(self):
        return json.dumps(self.outputs)
    
    def clear(self):
        self.outputs = []

_capture = OutputCapture()

def resolve_dataset_path(filename):
    """Resolve dataset path across cloud and browser mounts."""
    candidates = [
        Path('/workspace/datasets') / filename,
        Path('/datasets') / filename
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    for root in [Path('/workspace/datasets'), Path('/datasets')]:
        if root.exists():
            matches = list(root.rglob(filename))
            if matches:
                return str(matches[0])
    return str(candidates[0])
`);

        onProgress?.(100, 'Ready');
        pyodideInstance = pyodide;

        return pyodide;
    })();

    await initPromise;
}

/**
 * Check if Pyodide is ready
 */
export function isPyodideReady(): boolean {
    return pyodideInstance !== null;
}

/**
 * Execute Python code
 */
export async function executePython(code: string): Promise<ExecutionResult> {
    if (!pyodideInstance) {
        return {
            status: 'error',
            stdout: '',
            stderr: 'Pyodide not initialized',
            outputs: [{ type: 'error', content: 'Pyodide not initialized. Call loadPyodide() first.' }],
            executionMs: 0,
            error: 'Pyodide not initialized'
        };
    }

    const startTime = performance.now();
    const stdoutContent = '';
    const stderrContent = '';

    try {
        // Clear previous outputs
        await pyodideInstance.runPythonAsync('_capture.clear()');

        // Wrap code with output capture - use exec() to avoid indentation issues
        const wrappedCode = `
import os
import builtins
os.chdir('/workspace')

# Override print using builtins to avoid any scope issues
builtins.print = _capture.capture_print

_user_code = """${code.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}"""

try:
    exec(_user_code)
except Exception as e:
    import traceback
    _capture.outputs.append({
        "type": "error",
        "content": traceback.format_exc()
    })
finally:
    builtins.print = _builtin_print
`;

        await pyodideInstance.runPythonAsync(wrappedCode);

        // Get captured outputs
        const outputsJson = await pyodideInstance.runPythonAsync('_capture.get_outputs()') as string;
        const outputs: RichOutput[] = JSON.parse(outputsJson);

        const executionMs = performance.now() - startTime;

        // Check if there were any errors
        const hasError = outputs.some(o => o.type === 'error');

        return {
            status: hasError ? 'error' : 'success',
            stdout: stdoutContent,
            stderr: stderrContent,
            outputs,
            executionMs: Math.round(executionMs)
        };
    } catch (error) {
        const executionMs = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
            status: 'error',
            stdout: stdoutContent,
            stderr: errorMessage,
            outputs: [{ type: 'error', content: errorMessage }],
            executionMs: Math.round(executionMs),
            error: errorMessage
        };
    }
}

/**
 * Install a package via micropip
 */
export async function installPackage(packageName: string): Promise<{ success: boolean; message: string }> {
    if (!pyodideInstance) {
        return { success: false, message: 'Pyodide not initialized' };
    }

    const normalized = normalizePackageName(packageName);
    if (normalized && BROWSER_UNSUPPORTED_PACKAGES.has(normalized)) {
        return {
            success: false,
            message: `${packageName} requires native wheels and is not supported in browser mode. Switch to the cloud runtime to install it.`
        };
    }

    if (loadedPackages.has(packageName)) {
        return { success: true, message: `${packageName} already installed` };
    }

    try {
        // First try Pyodide built-in packages
        try {
            await pyodideInstance.loadPackage(packageName);
            loadedPackages.add(packageName);
            return { success: true, message: `Installed ${packageName}` };
        } catch {
            // Fall back to micropip for pure Python packages
        }

        // Load micropip if not already loaded
        if (!loadedPackages.has('micropip')) {
            await pyodideInstance.loadPackage('micropip');
            loadedPackages.add('micropip');
        }

        await pyodideInstance.runPythonAsync(`
import micropip
await micropip.install('${packageName}')
`);

        loadedPackages.add(packageName);
        return { success: true, message: `Installed ${packageName}` };
    } catch (error) {
        const rawMessage = error instanceof Error ? error.message : 'Failed to install package';
        if (
            rawMessage.includes('pure Python 3 wheel') ||
            rawMessage.includes('No matching distribution found') ||
            rawMessage.includes('platform tag')
        ) {
            return {
                success: false,
                message: `${packageName} is not available as a pure Python wheel for the browser runtime. Switch to the cloud runtime to install it.`
            };
        }
        return {
            success: false,
            message: rawMessage
        };
    }
}

/**
 * List installed packages
 */
export async function getInstalledPackages(): Promise<PackageInfo[]> {
    if (!pyodideInstance) {
        return [];
    }

    try {
        const payload = await pyodideInstance.runPythonAsync(`
import importlib.metadata as m
import json

packages = []
for dist in m.distributions():
    meta = dist.metadata
    name = meta.get('Name') or dist.name
    version = dist.version
    summary = meta.get('Summary', '')
    homepage = meta.get('Home-page', '') or meta.get('Home-Page', '')
    packages.append({
        "name": name,
        "version": version,
        "summary": summary,
        "homepage": homepage
    })

packages = sorted(packages, key=lambda p: (p.get('name') or '').lower())
json.dumps(packages)
`);

        const parsed = JSON.parse(payload as string) as PackageInfo[];
        return Array.isArray(parsed)
            ? parsed.filter((pkg) => Boolean(pkg?.name))
            : [];
    } catch {
        return Array.from(loadedPackages).map((name) => ({ name }));
    }
}

/**
 * Mount a dataset file into the virtual filesystem
 */
export async function mountDataset(filename: string, content: ArrayBuffer | string): Promise<void> {
    if (!pyodideInstance) {
        throw new Error('Pyodide not initialized');
    }

    const path = `/workspace/datasets/${filename}`;

    if (typeof content === 'string') {
        pyodideInstance.FS.writeFile(path, content);
    } else {
        pyodideInstance.FS.writeFile(path, new Uint8Array(content));
    }
}

/**
 * List files in the datasets directory
 */
export function listDatasets(): string[] {
    if (!pyodideInstance) {
        return [];
    }

    try {
        return pyodideInstance.FS.readdir('/workspace/datasets')
            .filter(f => f !== '.' && f !== '..');
    } catch {
        return [];
    }
}

/**
 * Helper to load a script dynamically
 */
function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

function normalizePackageName(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    const firstToken = trimmed.split(/[,\s]/)[0] ?? trimmed;
    const withoutExtras = firstToken.split('[')[0] ?? firstToken;
    const withoutSpecifier = withoutExtras.split(/[<>=!~]/)[0] ?? withoutExtras;
    return withoutSpecifier.trim().toLowerCase().replace(/_/g, '-');
}

function disableAmdLoader(): () => void {
    const globalWindow = window as unknown as {
        define?: ((...args: unknown[]) => unknown) & { amd?: boolean };
        require?: unknown;
        requirejs?: unknown;
    };
    const hasAmd = typeof globalWindow.define === 'function' && globalWindow.define.amd;
    const previous = {
        define: globalWindow.define,
        require: globalWindow.require,
        requirejs: globalWindow.requirejs
    };

    if (hasAmd) {
        globalWindow.define = undefined;
        globalWindow.require = undefined;
        globalWindow.requirejs = undefined;
    }

    return () => {
        if (hasAmd) {
            globalWindow.define = previous.define;
            globalWindow.require = previous.require;
            globalWindow.requirejs = previous.requirejs;
        }
    };
}
