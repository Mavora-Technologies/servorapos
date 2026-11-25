// apps/web/components/auth/LoginClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { resolveSafeRedirectPath } from '@/lib/rbac';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface AuthenticatedUserPayload {
  id: number;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  role: string;
  permissions?: string[];
}

interface WorkspacePayload {
  user: AuthenticatedUserPayload;
  business: { id: number; name: string };
  branch?: { id: number; name: string; code: string } | null;
}

interface LoginApiResponse {
  data?: {
    token?: string;
    user?: AuthenticatedUserPayload;
  };
}

interface AuthMeApiResponse {
  data?: WorkspacePayload;
}

const CAPABILITY_PILLS = [
  'Connected POS & KDS',
  'Recipe BOM Inventory',
  'M-Pesa & BI Analytics',
];

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    const lower = error.message.toLowerCase();
    if (
      lower.includes('failed to fetch') ||
      lower.includes('unable to connect') ||
      lower.includes('network') ||
      lower.includes('timeout')
    ) {
      return 'Unable to reach Servora right now. Please check your internet connection and try again.';
    }
    if (
      lower.includes('unauthorized') ||
      lower.includes('invalid') ||
      lower.includes('credentials') ||
      lower.includes('not found') ||
      lower.includes('password')
    ) {
      return "We couldn't sign you in with those details. Please check your email and password and try again.";
    }
    return error.message;
  }
  return "We couldn't sign you in right now. Please try again.";
}

function clearPreviousTerminalSession(): void {
  localStorage.removeItem('servora_token');
  localStorage.removeItem('servora_active_branch_id');
  localStorage.removeItem('servora_active_branch_name');
  localStorage.removeItem('servora_cached_workspace');
  localStorage.removeItem('servora_cached_branches');
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewlyRegistered = searchParams.get('registered') === 'true';
  const requestedRedirect = searchParams.get('next') || searchParams.get('redirect');

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  // If an operator is already signed in, route them directly to their authorized workspace
  useEffect(() => {
    const existingToken = localStorage.getItem('servora_token');
    if (!existingToken) return;

    let cancelled = false;

    const resumeSession = async () => {
      try {
        const meRes = (await fetchApi('/api/v1/auth/me')) as AuthMeApiResponse;
        if (cancelled) return;

        if (meRes?.data?.user) {
          localStorage.setItem('servora_cached_workspace', JSON.stringify(meRes.data));
          const destination = resolveSafeRedirectPath(
            requestedRedirect,
            meRes.data.user.permissions,
            meRes.data.user.role
          );
          router.replace(destination);
        }
      } catch {
        // Stale or revoked token — clear silently and keep login form visible
        clearPreviousTerminalSession();
      }
    };

    void resumeSession();
    return () => {
      cancelled = true;
    };
  }, [router, requestedRedirect]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isLoading) return;
    setIsLoading(true);
    setServerError(null);

    try {
      // Clear any previous operator's cached workspace/branch context on shared POS terminals
      clearPreviousTerminalSession();

      const result = (await fetchApi('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })) as LoginApiResponse;

      const token = result?.data?.token;
      if (!token || typeof token !== 'string') {
        throw new Error('Authentication response was incomplete. Please try again.');
      }

      localStorage.setItem('servora_token', token);

      // Hydrate authoritative live RBAC permissions & default branch before routing
      let userRole = result.data?.user?.role;
      let userPermissions = result.data?.user?.permissions;

      try {
        const meRes = (await fetchApi('/api/v1/auth/me')) as AuthMeApiResponse;
        if (meRes?.data?.user) {
          userRole = meRes.data.user.role;
          userPermissions = meRes.data.user.permissions;
          localStorage.setItem('servora_cached_workspace', JSON.stringify(meRes.data));

          if (meRes.data.branch?.id) {
            localStorage.setItem('servora_active_branch_id', String(meRes.data.branch.id));
            localStorage.setItem('servora_active_branch_name', meRes.data.branch.name);
          }
        }
      } catch {
        // Fallback to login payload role/permissions if /me temporarily fails
      }

      const targetRoute = resolveSafeRedirectPath(
        requestedRedirect,
        userPermissions,
        userRole
      );

      router.replace(targetRoute);
    } catch (error: unknown) {
      clearPreviousTerminalSession();
      setServerError(getFriendlyErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden lg:overflow-hidden">
      {/* --- LEFT PANEL: COMPACT, VIEWPORT-SAFE BRAND EXPERIENCE (DESKTOP) --- */}
      <aside className="hidden lg:flex flex-col justify-between lg:w-[48%] xl:w-1/2 bg-servora-navy relative overflow-hidden px-10 py-8 xl:px-14 xl:py-10 text-white">
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-servora-core/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="bg-white px-3.5 py-2 rounded-xl inline-flex items-center shadow-lg hover:opacity-95 transition-opacity"
            aria-label="Servora Home"
          >
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={88}
              height={88}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5 text-servora-teal"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Centerpiece: Headline + Dashboard Preview + Pills */}
        <div className="relative z-10 my-auto py-4 max-w-lg">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-servora-teal mb-2">
            Servora Hospitality Platform
          </span>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
            Smarter Hospitality,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-servora-teal to-servora-bright">
              All in One Place.
            </span>
          </h1>

          <p className="mt-2.5 text-servora-pale/80 text-xs xl:text-sm leading-relaxed">
            Manage orders, kitchen workflows, recipe inventory, M-Pesa payments, and multi-branch performance from one connected workspace.
          </p>

          {/* Dashboard Preview */}
          <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-2 shadow-2xl">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/resources/servora-dashboard-overview.png"
                alt="Servora hospitality management overview dashboard preview"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>

          {/* Compact Capability Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CAPABILITY_PILLS.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px] font-semibold text-servora-pale"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-servora-teal" />
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Brand Bar */}
        <div className="relative z-10 border-t border-white/10 pt-4 flex items-center justify-between gap-4 text-xs text-servora-pale/75">
          <div>
            <p className="font-bold text-white">Servora — Simplify Service. Grow Smarter.</p>
            <p className="text-[11px] text-servora-pale/65">Developed by Mavora Technologies Ltd.</p>
          </div>
          <Link href="/contact" className="text-servora-teal font-bold hover:underline shrink-0">
            Need help? &rarr;
          </Link>
        </div>
      </aside>

      {/* --- RIGHT PANEL: LOGIN FORM --- */}
      <main className="w-full lg:w-[52%] xl:w-1/2 flex flex-col items-center justify-center relative px-4 py-8 sm:px-8 lg:p-10 overflow-y-auto">
        {/* Centered Mobile & Tablet Logo */}
        <div className="w-full max-w-[440px] flex lg:hidden justify-center mb-6">
          <Link
            href="/"
            className="bg-white px-5 py-3 rounded-2xl inline-flex items-center justify-center shadow-sm border border-gray-200/80"
            aria-label="Servora Home"
          >
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={104}
              height={104}
              priority
              className="h-14 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(3,25,77,0.06)] border border-gray-200/80 p-6 sm:p-9">
          <div className="text-center lg:text-left mb-7">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-servora-teal mb-1.5">
              Servora Account Access
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-servora-deepTeal mt-1.5 leading-relaxed">
              Sign in to open your role-authorized Servora workspace.
            </p>
          </div>

          {isNewlyRegistered && !serverError && (
            <div
              role="status"
              className="mb-5 p-4 text-xs bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2.5"
            >
              <svg
                className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-bold">Workspace created successfully.</p>
                <p className="mt-0.5 text-emerald-800">
                  Sign in with your business email and password to open your workspace.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {serverError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 p-4 text-xs text-red-800 bg-red-50 rounded-xl border border-red-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 shrink-0 text-red-600 mt-0.5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold leading-relaxed">{serverError}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-servora-navy mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    stroke="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email', {
                    onChange: () => {
                      if (serverError) setServerError(null);
                    },
                  })}
                  className={`w-full h-11 pl-10 pr-4 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="manager@restaurant.co.ke"
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="text-red-600 text-[11px] mt-1.5 font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-servora-navy" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-servora-core hover:text-blue-700 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    stroke="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password', {
                    onChange: () => {
                      if (serverError) setServerError(null);
                    },
                  })}
                  className={`w-full h-11 pl-10 pr-11 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-servora-deepTeal hover:text-servora-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-servora-core rounded-r-xl cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-red-600 text-[11px] mt-1.5 font-semibold">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-12 px-5 bg-servora-core hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md shadow-servora-core/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Signing you in...</span>
                </>
              ) : (
                'Sign In to Servora'
              )}
            </button>

            <div className="pt-2 text-center text-xs">
              <span className="text-servora-deepTeal">New to Servora? </span>
              <Link
                href="/register"
                className="font-bold text-servora-core hover:text-blue-700 hover:underline transition-colors"
              >
                Create an account
              </Link>
            </div>
          </form>

          <div className="mt-7 pt-5 border-t border-gray-100 flex items-center justify-center text-[11px] text-servora-deepTeal font-medium gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-servora-teal shrink-0"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <span>Secure access to your Servora business workspace.</span>
          </div>
        </div>

        {/* Mobile Back to Home link */}
        <div className="mt-5 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-servora-deepTeal hover:text-servora-core transition-colors"
          >
            &larr; Back to Servora Home
          </Link>
        </div>
      </main>
    </div>
  );
}