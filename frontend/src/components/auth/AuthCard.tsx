/**
 * AuthCard - Frosted glass card container for auth forms
 *
 * Features:
 * - Frosted glass effect (backdrop blur + translucency)
 * - Subtle shadow and border
 * - Responsive sizing
 * - Optional decorative gradient background
 */

import { cn } from '@/lib/utils';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className="relative">
      {/* Decorative gradient blobs for visual interest */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Main card with frosted glass effect */}
      <div
        className={cn(
          'relative z-10',
          'w-full max-w-md p-8',
          'rounded-2xl',
          // Frosted glass effect
          'bg-background/80 backdrop-blur-xl',
          'border border-border/50',
          // Shadow for depth
          'shadow-xl shadow-black/5 dark:shadow-black/20',
          // Ring for subtle highlight
          'ring-1 ring-white/10 dark:ring-white/5',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * AuthPageWrapper - Full page wrapper for auth screens with centered content
 */
interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background overflow-hidden">
      {children}
    </div>
  );
}
