/**
 * RuntimeToggle - Animated cloud/browser execution mode toggle
 * 
 * Features:
 * - Stroke-dashoffset animated SVG (path drawing/tracing effect)
 * - Globe with rotating longitude lines
 * - Cloud with drifting motion
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExecutionMode } from '@/lib/pyodide/types';
import { Loader2 } from 'lucide-react';
import './RuntimeToggle.css';

interface RuntimeToggleProps {
    mode: ExecutionMode;
    onModeChange: (mode: ExecutionMode) => void;
    pyodideReady: boolean;
    pyodideProgress: number;
    pyodideInitializing?: boolean;
    cloudInitializing?: boolean;
    cloudAvailable: boolean;
    isExecuting: boolean;
    className?: string;
}

export function RuntimeToggle({
    mode,
    onModeChange,
    pyodideReady,
    pyodideInitializing,
    cloudInitializing,
    cloudAvailable,
    isExecuting,
    className
}: RuntimeToggleProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = () => {
        if (isExecuting) return;

        setIsAnimating(true);
        onModeChange(mode === 'browser' ? 'cloud' : 'browser');

        setTimeout(() => setIsAnimating(false), 600);
    };

    const isCloud = mode === 'cloud';
    const isLoading = (!isCloud && !pyodideReady && pyodideInitializing) || (isCloud && cloudInitializing);

    const statusText = isExecuting
        ? 'Running...'
        : isCloud
            ? cloudInitializing
                ? 'Connecting...'
                : (cloudAvailable ? 'Cloud' : 'Unavailable')
            : isLoading
                ? 'Loading...'
                : 'Browser';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggle}
                        disabled={isExecuting || isLoading}
                        className={cn(
                            'gap-1.5 px-2 h-7 text-xs font-medium transition-all duration-300',
                            isCloud
                                ? 'text-blue-500 hover:bg-blue-500/10'
                                : 'text-emerald-500 hover:bg-emerald-500/10',
                            className
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className={cn(
                                'transition-transform duration-300',
                                isAnimating && 'scale-125'
                            )}>
                                {isCloud ? (
                                    <AnimatedCloudIcon active={cloudAvailable} />
                                ) : (
                                    <AnimatedGlobeIcon active={pyodideReady} />
                                )}
                            </div>
                        )}
                        <span>{statusText}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                    <div className="font-medium mb-1">
                        {isCloud ? 'Cloud Runtime' : 'Browser Runtime'}
                    </div>
                    <div className="text-muted-foreground">
                        {isCloud
                            ? 'Server-side Python execution with full library support (NumPy, Pandas, Scikit-learn)'
                            : 'In-browser Python via Pyodide WebAssembly. No server required.'}
                    </div>
                    <div className="text-muted-foreground mt-1 italic">
                        Click to switch
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Animated Globe with stroke-dashoffset path tracing on longitude lines
 */
function AnimatedGlobeIcon({ active }: { active: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={cn('h-4 w-4 globe-icon', active && 'runtime-icon--active')}
            fill="none"
        >
            {/* Outer circle - draws on mount */}
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.5"
                fill={active ? 'currentColor' : 'none'}
                fillOpacity={active ? 0.08 : 0}
                className={active ? 'globe-circle' : ''}
            />

            {/* Equator line - draws horizontally */}
            <path
                d="M2 12h20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className={active ? 'globe-equator' : ''}
            />

            {/* Longitude line - continuously traces */}
            <path
                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className={active ? 'globe-longitude' : ''}
            />
        </svg>
    );
}

/**
 * Animated Cloud with stroke drawing effect and drift
 */
function AnimatedCloudIcon({ active }: { active: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={cn('h-4 w-4', active && 'runtime-icon--active')}
            fill="none"
        >
            {/* Cloud path - draws on mount */}
            <path
                d="M6.5 19a4.5 4.5 0 0 1-.42-8.98 6 6 0 0 1 11.84 0A4.5 4.5 0 0 1 17.5 19h-11Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={active ? 'currentColor' : 'none'}
                fillOpacity={active ? 0.1 : 0}
                className={active ? 'cloud-path' : ''}
            />
        </svg>
    );
}
