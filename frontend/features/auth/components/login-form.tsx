'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signIn } from '@/lib/auth-client';
import { clearCsrfToken } from '@/lib/api-client';
import { HOME_PATH } from '@/lib/config';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginValues } from '../schemas/login.schema';

export function LoginForm() {
  const searchParams = useSearchParams();

  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const sessionExpired = searchParams.get('expired') === '1';
  const nextPath = searchParams.get('next');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);

    // The previous session's CSRF token dies with the sign-in.
    clearCsrfToken();

    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Deliberately vague: never reveal whether the account exists.
      setFormError(
        error.status === 403
          ? 'This account is deactivated. Ask an administrator to reactivate it.'
          : 'That email and password do not match.',
      );
      return;
    }

    // A full navigation rather than a client push, so nothing cached from a
    // previous session survives the sign-in.
    window.location.assign(nextPath?.startsWith('/') ? nextPath : HOME_PATH);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {sessionExpired && !formError && (
        <Alert>
          <AlertDescription>Your session ended. Sign in to continue.</AlertDescription>
        </Alert>
      )}

      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[0.8125rem] font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="you@greenstone.co.ke"
          className="h-11"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-destructive text-[0.8125rem]">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[0.8125rem] font-medium">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="h-11 pr-12"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => {
              setShowPassword((visible) => !visible);
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground absolute inset-y-0 right-0',
              'flex w-12 items-center justify-center rounded-r-md transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            )}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="size-[1.05rem]" aria-hidden />
            ) : (
              <Eye className="size-[1.05rem]" aria-hidden />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-destructive text-[0.8125rem]">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="h-11 w-full text-[0.9375rem]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-muted-foreground border-t pt-5 text-center text-[0.8125rem]">
        Accounts are created by an administrator. Contact yours if you cannot sign in.
      </p>
    </form>
  );
}
