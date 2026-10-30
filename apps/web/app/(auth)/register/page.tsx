'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// Zod validation matching the backend tenant.validator.ts payload
const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      // Connect to our existing Tenant Onboarding API endpoint
      const response = await fetch('http://localhost:8000/api/v1/tenants/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to register account');
      }

      // Successful onboarding! Route to login page to generate their first session token
      router.push('/login?registered=true');
      
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-servora-pale">
      
      {/* 
        Left Side: Brand & Marketing Panel (Hidden on Mobile/Tablet, visible on Desktop) 
      */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-servora-navy relative overflow-hidden p-12 xl:p-20">
        
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-servora-core/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-servora-teal/20 blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <div className="bg-white px-5 py-3.5 rounded-xl inline-flex shadow-lg mb-16">
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={140}
              height={42}
              priority
              className="object-contain"
            />
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white tracking-tight leading-[1.15] mb-6">
            Start growing<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-servora-teal to-servora-bright">
              your restaurant
            </span><br />
            with Servora.
          </h1>
          <p className="text-servora-pale/80 text-lg max-w-md leading-relaxed">
            Join thousands of hospitality businesses managing their operations, inventory, and point of sale from one powerful platform.
          </p>
        </div>

        {/* Social Proof / Trust Indicators */}
        <div className="relative z-10 flex items-center gap-4 border-t border-white/10 pt-8 mt-12">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-servora-core border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-white">MK</div>
            <div className="w-10 h-10 rounded-full bg-servora-teal border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-white">JD</div>
            <div className="w-10 h-10 rounded-full bg-white border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-servora-navy">1k+</div>
          </div>
          <span className="text-sm font-medium text-servora-pale/80">Trusted by Kenyan hospitality leaders</span>
        </div>
      </div>

      {/* 
        Right Side: Interactive Form Panel (Full width on Mobile, half width on Desktop) 
      */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative p-4 sm:p-8 xl:p-12 overflow-y-auto">
        
        {/* Mobile-only background blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-servora-core/5 blur-[100px] pointer-events-none lg:hidden" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-servora-teal/5 blur-[100px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 z-10 my-8">
          
          {/* Mobile-only logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={150}
              height={45}
              priority
              className="object-contain"
            />
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-servora-navy tracking-tight">
              Create an account
            </h2>
            <p className="text-sm text-servora-deepTeal/80 mt-1.5">
              Set up your restaurant workspace to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {serverError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50/80 rounded-lg border border-red-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-red-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {/* Business Name */}
            <div>
              <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="businessName">
                Restaurant / Business Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                  </svg>
                </div>
                <input
                  id="businessName"
                  type="text"
                  {...register('businessName')}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.businessName 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Mavora Coffee House"
                />
              </div>
              {errors.businessName && <p className="text-red-500 text-[11px] mt-1.5">{errors.businessName.message}</p>}
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="firstName">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    {...register('firstName')}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                      errors.firstName 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                    }`}
                    placeholder="Jacobs"
                  />
                </div>
                {errors.firstName && <p className="text-red-500 text-[11px] mt-1.5">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="lastName">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    {...register('lastName')}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                      errors.lastName 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                    }`}
                    placeholder="Moh"
                  />
                </div>
                {errors.lastName && <p className="text-red-500 text-[11px] mt-1.5">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="email">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-[11px] mt-1.5">{errors.email.message}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-[11px] mt-1.5">{errors.password.message}</p>}
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-2.5 px-4 bg-servora-core hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-11"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Create Account'
              )}
            </button>
            
            <div className="mt-4 text-center text-[13px]">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="font-medium text-servora-core hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}