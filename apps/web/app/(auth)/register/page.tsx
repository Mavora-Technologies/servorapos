// apps/web/app/register/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

const registerSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters'),
  firstName: z.string().trim().min(2, 'First name is required'),
  lastName: z.string().trim().min(2, 'Last name is required'),
  email: z.string().trim().email('Please enter a valid business email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const PLATFORM_HIGHLIGHTS = [
  {
    title: 'Smart Point of Sale',
    description: 'Manage sales, orders, and front-of-house service workflows.',
  },
  {
    title: 'Kitchen Operations',
    description: 'Coordinate kitchen execution through supported KDS workflows.',
  },
  {
    title: 'Inventory & Recipe Costing',
    description: 'Connect configured menu recipes to ingredient consumption and stock visibility.',
  },
  {
    title: 'Business Analytics',
    description: 'Understand sales performance, tenders, and operational activity.',
  },
  {
    title: 'Multi-Outlet Management',
    description: 'Manage multiple locations through supported centralized functionality.',
  },
];

function getPasswordGuidance(password: string): {
  label: string;
  barWidth: string;
  barColor: string;
  textColor: string;
} {
  if (!password) {
    return {
      label: 'Minimum 8 characters',
      barWidth: 'w-0',
      barColor: 'bg-gray-200',
      textColor: 'text-servora-deepTeal',
    };
  }
  if (password.length < 8) {
    return {
      label: 'Too short — use at least 8 characters',
      barWidth: 'w-1/3',
      barColor: 'bg-red-400',
      textColor: 'text-red-600',
    };
  }
  const hasMixed =
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    (/\d/.test(password) || /[^A-Za-z0-9]/.test(password));
  if (password.length >= 10 && hasMixed) {
    return {
      label: 'Stronger password',
      barWidth: 'w-full',
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-700',
    };
  }
  return {
    label: 'Basic password — add uppercase, numbers, or symbols to strengthen',
    barWidth: 'w-2/3',
    barColor: 'bg-amber-400',
    textColor: 'text-amber-700',
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Registration could not be completed. Please try again.';
}

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedPlan = searchParams.get('plan');
  const selectedBilling = searchParams.get('billing');

  const [serverError, setServerError] = useState<{
    message: string;
    isEmailConflict?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const passwordValue = watch('password') || '';
  const passwordGuidance = getPasswordGuidance(passwordValue);

  const onSubmit = async (data: RegisterFormValues) => {
    if (isLoading) return;
    setIsLoading(true);
    setServerError(null);

    try {
      await fetchApi('/api/v1/tenants/onboard', {
        method: 'POST',
        body: JSON.stringify({
          businessName: data.businessName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        }),
      });

      router.push('/login?registered=true');
    } catch (error: unknown) {
      const rawMessage = getErrorMessage(error);
      const isEmailConflict =
        rawMessage.toLowerCase().includes('already registered') ||
        rawMessage.toLowerCase().includes('already exists') ||
        rawMessage.toLowerCase().includes('email');

      if (isEmailConflict) {
        setError('email', {
          type: 'manual',
          message: 'This email address is already registered.',
        });
        setServerError({
          message: 'This email address is already registered.',
          isEmailConflict: true,
        });
      } else {
        setServerError({
          message: rawMessage,
          isEmailConflict: false,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formattedPlan = selectedPlan
    ? selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)
    : null;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      {/* --- LEFT BRAND PANEL (DESKTOP) --- */}
      <aside className="hidden lg:flex flex-col justify-between lg:w-[46%] xl:w-1/2 bg-servora-navy relative overflow-hidden p-10 xl:p-14 text-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-servora-core/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link
            href="/"
            className="bg-white px-4 py-2.5 rounded-2xl inline-flex items-center shadow-lg mb-8 hover:opacity-95 transition-opacity"
            aria-label="Servora Home"
          >
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={96}
              height={96}
              priority
              className="h-14 w-auto object-contain"
            />
          </Link>

          <span className="block text-[11px] font-bold uppercase tracking-widest text-servora-teal mb-2.5">
            Welcome to Servora
          </span>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.14] mb-4">
            Run Your Hospitality Business{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-servora-teal to-servora-bright">
              Smarter.
            </span>
          </h1>

          <p className="text-servora-pale/85 text-sm max-w-md leading-relaxed">
            Bring your sales, orders, kitchen operations, inventory, and business insights together in one connected hospitality management platform.
          </p>

          <ul className="mt-6 space-y-3.5 max-w-md">
            {PLATFORM_HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex w-5 h-5 rounded-full bg-servora-teal/20 text-servora-teal items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-white leading-snug">{item.title}</p>
                  <p className="text-xs text-servora-pale/75 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-5 mt-8 flex items-center justify-between gap-4 text-xs text-servora-pale/75">
          <div>
            <p className="font-bold text-white">Designed for Modern Hospitality Operations</p>
            <p className="mt-0.5">Developed by Mavora Technologies Ltd &bull; Nairobi, Kenya</p>
          </div>
          <Link href="/pricing" className="text-servora-teal font-bold hover:underline shrink-0">
            View Plans &rarr;
          </Link>
        </div>
      </aside>

      {/* --- RIGHT FORM PANEL --- */}
      <main className="w-full lg:w-[54%] xl:w-1/2 flex flex-col items-center justify-center relative px-4 py-8 sm:px-8 lg:p-10 overflow-y-auto">
        {/* Centered Mobile & Tablet Logo */}
        <div className="w-full max-w-[480px] flex lg:hidden justify-center mb-6">
          <Link
            href="/"
            className="bg-white px-5 py-3 rounded-2xl inline-flex items-center justify-center shadow-sm border border-gray-200/80"
            aria-label="Servora Home"
          >
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={110}
              height={110}
              priority
              className="h-16 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(3,25,77,0.06)] border border-gray-200/80 p-6 sm:p-9">
          <div className="text-center lg:text-left mb-7">
            <div className="flex flex-wrap items-center justify-center lg:justify-between gap-2 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-servora-teal">
                Workspace Onboarding
              </span>
              {formattedPlan && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-servora-core/10 px-3 py-1 text-[10px] font-bold text-servora-core">
                  Selected: {formattedPlan}
                  {selectedBilling ? ` (${selectedBilling})` : ''}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
              Create Your Servora Account
            </h2>
            <p className="text-xs sm:text-sm text-servora-deepTeal mt-1.5 leading-relaxed">
              Set up your business workspace and get started with connected hospitality management.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && (
              <div
                role="alert"
                className="p-4 text-xs bg-red-50 rounded-xl border border-red-200 text-red-800 space-y-1.5"
              >
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 shrink-0 text-red-600"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{serverError.message}</span>
                </div>
                {serverError.isEmailConflict && (
                  <p className="pl-6 text-gray-700">
                    Already have a Servora account?{' '}
                    <Link
                      href="/login"
                      className="font-bold text-servora-core underline hover:text-blue-700"
                    >
                      Sign in to continue
                    </Link>
                  </p>
                )}
              </div>
            )}

            {/* Business Name */}
            <div>
              <label
                className="block text-xs font-bold text-servora-navy mb-1.5"
                htmlFor="businessName"
              >
                Business / Restaurant Name <span className="text-red-600">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                autoComplete="organization"
                aria-invalid={Boolean(errors.businessName)}
                {...register('businessName')}
                className={`w-full h-11 px-3.5 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                  errors.businessName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                    : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                }`}
                placeholder="e.g. Mavora Coffee House"
              />
              {errors.businessName ? (
                <p role="alert" className="text-red-600 text-[11px] font-semibold mt-1">
                  {errors.businessName.message}
                </p>
              ) : (
                <p className="text-[11px] text-servora-deepTeal/80 mt-1">
                  Enter the name of the business you want to manage with Servora.
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs font-bold text-servora-navy mb-1.5"
                  htmlFor="firstName"
                >
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  aria-invalid={Boolean(errors.firstName)}
                  {...register('firstName')}
                  className={`w-full h-11 px-3.5 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.firstName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Your first name"
                />
                {errors.firstName && (
                  <p role="alert" className="text-red-600 text-[11px] font-semibold mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-bold text-servora-navy mb-1.5"
                  htmlFor="lastName"
                >
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  aria-invalid={Boolean(errors.lastName)}
                  {...register('lastName')}
                  className={`w-full h-11 px-3.5 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.lastName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Your last name"
                />
                {errors.lastName && (
                  <p role="alert" className="text-red-600 text-[11px] font-semibold mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-servora-navy mb-1.5" htmlFor="email">
                Business Email Address <span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
                className={`w-full h-11 px-3.5 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                  errors.email
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/15'
                    : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                }`}
                placeholder="you@yourbusiness.com"
              />
              {errors.email && !serverError?.isEmailConflict && (
                <p role="alert" className="text-red-600 text-[11px] font-semibold mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                className="block text-xs font-bold text-servora-navy mb-1.5"
                htmlFor="password"
              >
                Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                  className={`w-full h-11 pl-3.5 pr-11 text-sm bg-servora-pale/40 border rounded-xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Create a secure password"
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

              {/* Password Strength Guidance */}
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordGuidance.barWidth} ${passwordGuidance.barColor}`}
                  />
                </div>
                {errors.password ? (
                  <p role="alert" className="text-red-600 text-[11px] font-semibold">
                    {errors.password.message}
                  </p>
                ) : (
                  <p className={`text-[11px] font-medium ${passwordGuidance.textColor}`}>
                    {passwordGuidance.label}
                  </p>
                )}
              </div>
            </div>

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
                  <span>Creating Your Workspace...</span>
                </>
              ) : (
                'Create My Servora Account'
              )}
            </button>

            <p className="text-[11px] text-center text-servora-deepTeal/80 leading-relaxed pt-1">
              By creating an account, you agree to the applicable Servora terms and acknowledge our privacy practices. Your business workspace starts with secure account setup.
            </p>

            <div className="pt-4 border-t border-gray-100 text-center text-xs">
              <span className="text-servora-deepTeal">Already have a Servora account? </span>
              <Link
                href="/login"
                className="font-bold text-servora-core hover:text-blue-700 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-servora-pale text-xs font-semibold text-servora-deepTeal">
          Loading workspace registration...
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}