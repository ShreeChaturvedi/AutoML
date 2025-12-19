/**
 * AuthSubmitButton - Professional animated submit button for auth forms
 *
 * Features:
 * - Animated gradient icon (arrow/check)
 * - Loading spinner during submission
 * - Success checkmark animation
 * - Consistent styling with rest of app
 */

import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AuthButtonState = 'idle' | 'loading' | 'success';

// Animated arrow icon with gradient
function AnimatedArrowIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="authArrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="url(#authArrowGradient)"
        className="animate-pulse"
      />
    </svg>
  );
}

interface AuthSubmitButtonProps {
  state?: AuthButtonState;
  idleText: string;
  loadingText: string;
  successText?: string;
  className?: string;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}

export function AuthSubmitButton({
  state = 'idle',
  idleText,
  loadingText,
  successText = 'Success',
  className,
  disabled,
  type = 'submit',
  onClick
}: AuthSubmitButtonProps) {
  return (
    <Button
      type={type}
      variant="secondary"
      disabled={state === 'loading' || disabled}
      onClick={onClick}
      className={cn(
        'w-full h-11 text-sm font-medium transition-all duration-200 gap-2',
        'hover:bg-secondary/80',
        className
      )}
    >
      {state === 'loading' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      )}
      {state === 'success' && (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span>{successText}</span>
        </>
      )}
      {state === 'idle' && (
        <>
          <span>{idleText}</span>
          <AnimatedArrowIcon />
        </>
      )}
    </Button>
  );
}
