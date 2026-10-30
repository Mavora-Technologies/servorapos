'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to authenticate');
      }

      localStorage.setItem('servora_token', result.data.token);
      router.push('/dashboard');
      
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-servora-pale relative selection:bg-servora-teal selection:text-white overflow-x-hidden">
      
      {/* Left Side: Brand & Marketing Panel (Visible on Desktop / Large Tablets) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-servora-navy relative overflow-hidden p-12 xl:p-20">
        
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-servora-core/25 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-servora-teal/20 blur-[140px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-start">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-md transition-all mb-10 border border-white/10"
          >
            <svg className="w-4 h-4 text-servora-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>

          {/* Logo isolated in a high-contrast container */}
          <div className="bg-white px-5 py-3.5 rounded-2xl inline-flex shadow-xl mb-10 ring-1 ring-white/20">
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={30}
              height={38}
              priority
              className="object-contain w-auto h-8"
            />
          </div>
          
          <div className="inline-flex items-center gap-2 rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest mb-4 border border-servora-teal/30">
            <span className="w-1.5 h-1.5 rounded-full bg-servora-teal animate-pulse" />
            Mavora Technologies Ecosystem
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-5">
            Simplify Service.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal">
              Grow Smarter.
            </span>
          </h1>
          <p className="text-gray-300 text-sm xl:text-base max-w-md leading-relaxed font-normal">
            Enterprise restaurant operations platform managing multi-branch orders, visual floor tables, automated inventory deductions, and M-Pesa payments.
          </p>
        </div>

        {/* Social Proof / Trust Indicators */}
        <div className="relative z-10 flex items-center gap-4 border-t border-white/10 pt-8 mt-12">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-servora-core border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-white shadow-md">MK</div>
            <div className="w-10 h-10 rounded-full bg-servora-teal border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-white shadow-md">JD</div>
            <div className="w-10 h-10 rounded-full bg-white border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-servora-navy shadow-md">1k+</div>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Trusted by Kenyan Hospitality Leaders</p>
            <p className="text-[11px] text-gray-400">Nairobi, Mombasa, Kisumu & beyond</p>
          </div>
        </div>
      </div>

      {/* 
        Right Side: Interactive Form Panel (Full width on Mobile/Tablet, half width on Desktop) 
      */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative p-6 sm:p-10 lg:p-12 xl:p-16">
        
        {/* Mobile-only background ambient blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-servora-core/10 blur-[120px] pointer-events-none lg:hidden" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-servora-teal/10 blur-[120px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(4,31,86,0.08)] border border-gray-100 p-8 sm:p-10 z-10 relative">
          
          {/* Mobile Back to Home Button */}
          <div className="flex lg:hidden items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-servora-navy hover:text-servora-core transition-colors"
            >
              <svg className="w-4 h-4 text-servora-core" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
            <span className="text-[10px] font-bold text-servora-teal uppercase tracking-wider">Servora Portal</span>
          </div>

          {/* Mobile-only logo */}
          <div className="flex lg:hidden justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={20}
              height={36}
              priority
              className="object-contain w-auto h-8"
            />
          </div>

          <div className="text-center lg:text-left mb-8">
            <div className="inline-block px-2.5 py-1 rounded-md bg-servora-pale text-servora-core text-[10px] font-extrabold uppercase tracking-wider mb-2">
              Simplify Service, Grow Smarter
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-servora-deepTeal mt-1.5 font-medium">
              Enter your credentials to access your restaurant dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {serverError && (
              <div className="flex items-center gap-3 p-4 text-xs text-red-700 bg-red-50/90 rounded-2xl border border-red-100 animate-in fade-in shadow-xs">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold leading-relaxed">{serverError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-servora-navy mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-medium bg-servora-pale/40 border rounded-2xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="manager@restaurant.co.ke"
                />
              </div>
              {errors.email && <p className="text-red-500 text-[11px] mt-1.5 font-bold">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-servora-navy" htmlFor="password">
                  Password
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs font-bold text-servora-core hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-medium bg-servora-pale/40 border rounded-2xl focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-[11px] mt-1.5 font-bold">{errors.password.message}</p>}
            </div>

            <div className="flex items-center pt-1">
              <input
                id="remember"
                type="checkbox"
                {...register('remember')}
                className="h-4 w-4 rounded border-gray-300 text-servora-core focus:ring-servora-core/30 bg-servora-pale cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2.5 block text-xs font-semibold text-servora-deepTeal cursor-pointer hover:text-servora-navy transition-colors">
                Remember this device for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3.5 px-4 bg-servora-core hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-servora-core/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-12"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
            
            <div className="mt-5 text-center text-xs">
              <span className="text-servora-deepTeal font-medium">Don't have an account? </span>
              <Link href="/register" className="font-bold text-servora-core hover:text-blue-700 transition-colors">
                Register with us
              </Link>
            </div>
            
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center text-[11px] text-servora-deepTeal font-medium gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-servora-teal">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296A3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043A3.746 3.746 0 0 1 21 12Z" />
            </svg>
            Secure access for Mavora Technologies platform
          </div>
        </div>
      </div>
    </div>
  );
}