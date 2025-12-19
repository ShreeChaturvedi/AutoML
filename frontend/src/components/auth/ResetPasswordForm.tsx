/**
 * ResetPasswordForm - Complete password reset with token
 *
 * Features:
 * - Frosted glass card design
 * - Animated submit button with gradient icon
 * - Password strength indicator
 * - Password match indicator
 * - Token validation from URL
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrength } from './PasswordStrength';
import { PasswordMatch } from './PasswordMatch';
import { resetPassword } from '@/lib/api/auth';
import { CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { AuthCard, AuthPageWrapper } from './AuthCard';
import { AuthSubmitButton, type AuthButtonState } from './AuthSubmitButton';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<AuthButtonState>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const password = watch('password') || '';
  const confirmPassword = watch('confirmPassword') || '';

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setFormError('Invalid or missing reset token');
      return;
    }

    setFormError(null);
    setButtonState('loading');
    try {
      await resetPassword({ token, password: data.password });
      setButtonState('success');
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: unknown) {
      const apiError = error as { status?: number };
      setButtonState('idle');
      if (apiError.status === 400) {
        setFormError('This reset link is invalid or has expired. Please request a new one.');
      } else {
        setFormError('An error occurred. Please try again.');
      }
    }
  };

  // Show error if no token
  if (!token) {
    return (
      <AuthPageWrapper>
        <AuthCard>
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Invalid reset link</h1>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>

            <Button asChild variant="secondary" className="w-full h-11">
              <Link to="/forgot-password">Request new reset link</Link>
            </Button>
          </div>
        </AuthCard>
      </AuthPageWrapper>
    );
  }

  if (success) {
    return (
      <AuthPageWrapper>
        <AuthCard>
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Password reset successful</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. Redirecting to login...
              </p>
            </div>
          </div>
        </AuthCard>
      </AuthPageWrapper>
    );
  }

  return (
    <AuthPageWrapper>
      <AuthCard>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground">
              Enter a new password for your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a new password"
                autoComplete="new-password"
                className="bg-transparent"
                {...register('password')}
              />
              <PasswordStrength password={password} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                autoComplete="new-password"
                className="bg-transparent"
                {...register('confirmPassword')}
              />
              <PasswordMatch password={password} confirmPassword={confirmPassword} />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {formError && (
              <p className="text-sm text-destructive text-center">{formError}</p>
            )}

            <AuthSubmitButton
              state={buttonState}
              idleText="Reset Password"
              loadingText="Resetting..."
              successText="Password reset!"
            />

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        </div>
      </AuthCard>
    </AuthPageWrapper>
  );
}
