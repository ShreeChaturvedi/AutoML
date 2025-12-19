import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useExecutionStore } from '@/stores/executionStore';
import { useDataStore } from '@/stores/dataStore';
import { searchPackages } from '@/lib/api/execution';
import type { PackageInfo } from '@/lib/pyodide/types';
import {
  Cloud,
  Cpu,
  Database,
  Loader2,
  Package,
  PackagePlus,
  RefreshCcw,
  Settings2
} from 'lucide-react';

const CLOUD_ONLY_PACKAGES = new Set([
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

interface RuntimeManagerDialogProps {
  projectId: string;
}

export function RuntimeManagerDialog({ projectId }: RuntimeManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [packageInput, setPackageInput] = useState('');
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [installState, setInstallState] = useState<'idle' | 'success' | 'error'>('idle');
  const [installing, setInstalling] = useState(false);
  const [packageSuggestions, setPackageSuggestions] = useState<PackageInfo[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [refreshingPackages, setRefreshingPackages] = useState(false);
  const suggestionsListId = useId();
  const blurTimeoutRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const {
    mode,
    pythonVersion,
    setPythonVersion,
    cloudAvailable,
    cloudInitializing,
    sessionId,
    installedPackages,
    installPackage,
    refreshPackages,
    initializeCloud,
    pyodideReady,
    pyodideInitializing,
    pyodideProgress
  } = useExecutionStore();

  const files = useDataStore((state) => state.files);
  const projectFiles = useMemo(
    () => files.filter((file) => file.projectId === projectId),
    [files, projectId]
  );
  const datasetFiles = useMemo(
    () => projectFiles.filter((file) => file.metadata?.datasetId),
    [projectFiles]
  );
  const datasetNameCounts = useMemo(
    () =>
      datasetFiles.reduce<Record<string, number>>((acc, file) => {
        acc[file.name] = (acc[file.name] ?? 0) + 1;
        return acc;
      }, {}),
    [datasetFiles]
  );
  const documentFiles = useMemo(
    () => projectFiles.filter((file) => file.metadata?.documentId),
    [projectFiles]
  );

  useEffect(() => {
    if (!open) return;
    void refreshPackages();
  }, [open, refreshPackages]);

  useEffect(() => {
    if (!open) {
      setSuggestionsOpen(false);
      setPackageSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !suggestionsOpen) return;

    const currentRequestId = ++requestIdRef.current;
    const query = packageInput.trim();

    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const suggestions = await searchPackages(query, 8);
        if (currentRequestId !== requestIdRef.current) return;
        setPackageSuggestions(suggestions);
        setActiveSuggestionIndex(-1);
      } catch (error) {
        if (currentRequestId !== requestIdRef.current) return;
        console.warn('[runtimeManager] Package search failed:', error);
        setPackageSuggestions([]);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [open, packageInput, suggestionsOpen]);

  useEffect(() => {
    if (activeSuggestionIndex >= packageSuggestions.length) {
      setActiveSuggestionIndex(-1);
    }
  }, [activeSuggestionIndex, packageSuggestions.length]);

  const handleSuggestionSelect = useCallback((suggestion: PackageInfo) => {
    setPackageInput(suggestion.name);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  }, []);

  const handlePackageFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setSuggestionsOpen(true);
  }, []);

  const handlePackageBlur = useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }, 150);
  }, []);

  const handlePackageKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!suggestionsOpen || packageSuggestions.length === 0) {
        if (event.key === 'ArrowDown') {
          setSuggestionsOpen(true);
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((prev) =>
          Math.min(prev + 1, packageSuggestions.length - 1)
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
        event.preventDefault();
        const selection = packageSuggestions[activeSuggestionIndex];
        if (selection) {
          handleSuggestionSelect(selection);
        }
      }

      if (event.key === 'Escape') {
        setSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
      }
    },
    [activeSuggestionIndex, handleSuggestionSelect, packageSuggestions, suggestionsOpen]
  );

  const handleRefreshPackages = useCallback(async () => {
    if (refreshingPackages) return;
    setRefreshingPackages(true);
    try {
      await refreshPackages();
    } finally {
      setRefreshingPackages(false);
    }
  }, [refreshPackages, refreshingPackages]);

  const handleInstall = async () => {
    const trimmed = packageInput.trim();
    if (!trimmed || installing) return;

    setInstalling(true);
    setInstallMessage(null);
    setInstallState('idle');

    const result = await installPackage(trimmed, projectId);
    setInstalling(false);
    setInstallMessage(result.message);
    setInstallState(result.success ? 'success' : 'error');
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);

    if (result.success) {
      setPackageInput('');
    }
  };

  const runtimeStatus = useMemo(() => {
    if (mode === 'cloud') {
      if (cloudInitializing) return 'Connecting';
      if (!cloudAvailable) return 'Unavailable';
      return sessionId ? 'Connected' : 'Available';
    }

    if (pyodideReady) return 'Ready';
    if (pyodideInitializing) return `Loading ${pyodideProgress}%`;
    return 'Idle';
  }, [mode, cloudInitializing, cloudAvailable, sessionId, pyodideReady, pyodideInitializing, pyodideProgress]);

  const isCloudOnlyPackage = useCallback((name: string) => {
    const normalized = name.trim().toLowerCase().replace(/_/g, '-');
    return CLOUD_ONLY_PACKAGES.has(normalized);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Runtime settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Runtime Manager</DialogTitle>
          <DialogDescription>
            Configure Python runtime, packages, and dataset mounts for this project.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="runtime" className="w-full min-h-[440px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="runtime">Runtime</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="datasets">Datasets</TabsTrigger>
          </TabsList>

          <TabsContent value="runtime" className="space-y-4 min-h-[340px]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                {mode === 'cloud' ? <Cloud className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
                {mode === 'cloud' ? 'Cloud Runtime' : 'Browser Runtime'}
              </Badge>
              <Badge
                variant={runtimeStatus === 'Connected' || runtimeStatus === 'Ready' ? 'default' : 'outline'}
                className="text-xs"
              >
                {runtimeStatus}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Python version</p>
                <Select value={pythonVersion} onValueChange={setPythonVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3.11">Python 3.11</SelectItem>
                    <SelectItem value="3.10">Python 3.10</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Session</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {mode === 'cloud'
                      ? sessionId
                        ? `Cloud session ${sessionId.slice(0, 8)}…`
                        : 'No cloud session yet'
                      : 'Browser session (per tab)'}
                  </Badge>
                  {mode === 'cloud' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => initializeCloud(projectId)}
                      disabled={!cloudAvailable || cloudInitializing}
                    >
                      {cloudInitializing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {sessionId ? 'Reconnect' : 'Connect'}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === 'cloud'
                    ? sessionId
                      ? 'Cloud sessions keep installed packages and cache data for faster runs.'
                      : 'Start a cloud session to cache packages and reuse datasets.'
                    : 'Browser runtime keeps packages in-memory for this tab only.'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Datasets mount at `/workspace/datasets` and resolve via `resolve_dataset_path()`.</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Install packages per session using pip (cloud) or micropip (browser).</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4 min-h-[340px]">
            <div className="flex flex-wrap items-start gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Input
                  value={packageInput}
                  onChange={(e) => {
                    setPackageInput(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={handlePackageFocus}
                  onBlur={handlePackageBlur}
                  onKeyDown={handlePackageKeyDown}
                  placeholder="pandas, xgboost, optuna..."
                  className="w-full"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={suggestionsOpen}
                  aria-controls={suggestionsOpen ? suggestionsListId : undefined}
                  aria-activedescendant={
                    activeSuggestionIndex >= 0
                      ? `${suggestionsListId}-option-${activeSuggestionIndex}`
                      : undefined
                  }
                  autoComplete="off"
                />
                {suggestionsOpen && (
                  <div
                    id={suggestionsListId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-background p-1 shadow-lg"
                  >
                    {suggestionsLoading && (
                      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Searching packages...
                      </div>
                    )}
                    {!suggestionsLoading && packageSuggestions.length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        No package matches found.
                      </div>
                    )}
                    {!suggestionsLoading && packageInput.trim().length === 0 && packageSuggestions.length > 0 && (
                      <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Suggested packages
                      </div>
                    )}
                    {packageSuggestions.map((pkg, index) => (
                      <button
                        key={`${pkg.name}-${pkg.version ?? 'latest'}`}
                        type="button"
                        id={`${suggestionsListId}-option-${index}`}
                        role="option"
                        aria-selected={index === activeSuggestionIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelect(pkg)}
                        className={cn(
                          'w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                          index === activeSuggestionIndex
                            ? 'bg-foreground/10 text-foreground'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{pkg.name}</span>
                          <div className="flex items-center gap-2">
                            {mode === 'browser' && isCloudOnlyPackage(pkg.name) && (
                              <Badge variant="outline" className="text-[10px]">
                                Cloud only
                              </Badge>
                            )}
                            {pkg.version && (
                              <span className="text-[11px] text-muted-foreground">{pkg.version}</span>
                            )}
                          </div>
                        </div>
                        {pkg.summary && (
                          <div className="text-xs text-muted-foreground">{pkg.summary}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleInstall}
                disabled={!packageInput.trim() || installing}
                variant="ghost"
                size="icon"
                title="Install packages"
                className="h-10 w-10 rounded-full border border-foreground/20 bg-transparent text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-foreground/10"
              >
                {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                <span className="sr-only">Install packages</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshPackages}
                title="Refresh installed packages"
                className="h-10 w-10 rounded-full border border-foreground/20 bg-transparent text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-foreground/10"
              >
                {refreshingPackages ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </div>
            {mode === 'browser' && (
              <p className="text-xs text-muted-foreground">
                Browser runtime supports pure Python wheels only. Use cloud runtime for native packages (e.g. torch).
              </p>
            )}

            {installMessage && (
              <div
                className={cn(
                  'rounded-md border px-3 py-2 text-xs',
                  installState === 'success'
                    ? 'border-emerald-500/40 text-emerald-600'
                    : 'border-destructive/40 text-destructive'
                )}
              >
                {installMessage}
              </div>
            )}

            <ScrollArea className="h-56 rounded-md border p-3">
              {installedPackages.length === 0 ? (
                <span className="text-xs text-muted-foreground">No packages reported yet.</span>
              ) : (
                <div className="space-y-2">
                  {installedPackages.map((pkg) => (
                    <div
                      key={`${pkg.name}-${pkg.version ?? 'latest'}`}
                      className="rounded-md border border-border/60 bg-background/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{pkg.name}</span>
                        {pkg.version && (
                          <Badge variant="secondary" className="text-[10px]">
                            {pkg.version}
                          </Badge>
                        )}
                      </div>
                      {pkg.summary && (
                        <p className="mt-1 text-xs text-muted-foreground">{pkg.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="datasets" className="space-y-4 min-h-[340px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {datasetFiles.length} dataset{datasetFiles.length === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {documentFiles.length} context doc{documentFiles.length === 1 ? '' : 's'}
              </Badge>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Quick load</p>
              <p className="mt-1 font-mono text-[11px]">
                df = pd.read_csv(resolve_dataset_path("your_file.csv"))
              </p>
            </div>

            <ScrollArea className="h-40 rounded-md border p-3">
              <div className="space-y-2 text-sm">
                {datasetFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Upload a dataset to see it here.</p>
                ) : (
                  datasetFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {datasetNameCounts[file.name] > 1 && file.metadata?.datasetId
                            ? `resolve_dataset_path("${file.name}", "${file.metadata.datasetId}")`
                            : `resolve_dataset_path("${file.name}")`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {file.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
