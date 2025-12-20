/**
 * SignupForm - User registration page
 *
 * Features:
 * - Wider card for more fields
 * - Spotlight effect background
 * - Password strength indicator (no label)
 * - Password match indicator
 * - Google OAuth at the bottom
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { registerUser, googleAuth } from '@/lib/api/auth';
import { AuthCard, AuthPageWrapper } from './AuthCard';
import { AuthSubmitButton, type AuthButtonState } from './AuthSubmitButton';
import { GoogleAuthButton } from './GoogleAuthButton';
import { PasswordStrength } from './PasswordStrength';
import { PasswordMatch } from './PasswordMatch';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const navigate = useNavigate();
  const { setUser, setTokens, isAuthenticated } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<AuthButtonState>('idle');
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  });

  const password = watch('password') || '';
  const confirmPassword = watch('confirmPassword') || '';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: SignupFormValues) => {
    setFormError(null);
    setButtonState('loading');
    try {
      const { name, email, password } = data;
      const response = await registerUser({ name, email, password });
      setUser(response.user);
      setTokens(response.accessToken, response.refreshToken);
      setButtonState('success');
      setTimeout(() => navigate('/'), 500);
    } catch (error: unknown) {
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 409) {
        setFormError('Email already registered');
      } else {
        setFormError('Registration failed. Please try again.');
      }
      setButtonState('idle');
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setFormError(null);
    try {
      const response = await googleAuth();
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch {
      setFormError('Google authentication failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthPageWrapper>
      <AuthCard>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Create an Account</h1>
            <p className="text-sm text-neutral-400">
              Enter your information to get started
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                className="bg-neutral-900/50 border-neutral-700 text-white placeholder:text-neutral-500"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="bg-neutral-900/50 border-neutral-700 text-white placeholder:text-neutral-500"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
                className="bg-neutral-900/50 border-neutral-700 text-white placeholder:text-neutral-500"
                {...register('password')}
              />
              <PasswordStrength password={password} />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-neutral-300">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="bg-neutral-900/50 border-neutral-700 text-white placeholder:text-neutral-500"
                {...register('confirmPassword')}
              />
              <PasswordMatch password={password} confirmPassword={confirmPassword} />
              {errors.confirmPassword && (
                <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {formError && (
              <p className="text-sm text-red-400 text-center">{formError}</p>
            )}

            <AuthSubmitButton
              state={buttonState}
              idleText="Continue"
              loadingText="Creating account..."
              successText="Account created!"
            />
          </form>

          {/* Google OAuth - at bottom */}
          <GoogleAuthButton
            onClick={handleGoogleAuth}
            isLoading={googleLoading}
            mode="signup"
          />

          {/* Footer */}
          <p className="text-center text-sm text-neutral-400">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthPageWrapper>
  );
}
