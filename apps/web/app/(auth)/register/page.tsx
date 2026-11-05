'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

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
  const [serverError, setServerError] = useState<{ message: string; isEmailConflict?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      await fetchApi('/api/v1/tenants/onboard', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      router.push('/login?registered=true');
    } catch (error: any) {
      const msg = error.message || 'Registration failed';
      const isEmailConflict = msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('email');

      if (isEmailConflict) {
        setError('email', {
          type: 'manual',
          message: 'Email is already registered',
        });
      }

      setServerError({
        message: msg,
        isEmailConflict,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-servora-pale">
      {/* Left Marketing Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-servora-navy relative overflow-hidden p-12 xl:p-20">
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

        <div className="relative z-10 flex items-center gap-4 border-t border-white/10 pt-8 mt-12">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-servora-core border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-white">MK</div>
            <div className="w-10 h-10 rounded-full bg-servora-teal border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-white">JD</div>
            <div className="w-10 h-10 rounded-full bg-white border-2 border-servora-navy flex items-center justify-center text-xs font-bold text-servora-navy">1k+</div>
          </div>
          <span className="text-sm font-medium text-servora-pale/80">Trusted by Kenyan hospitality leaders</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative p-4 sm:p-8 xl:p-12 overflow-y-auto">
        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 z-10 my-8">
          
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
              <div className="p-4 text-xs bg-red-50 rounded-xl border border-red-200 text-red-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-600">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  <span>{serverError.message}</span>
                </div>
                {serverError.isEmailConflict && (
                  <p className="pl-6 text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-bold text-servora-core underline hover:text-blue-700">
                      Sign in here
                    </Link>
                  </p>
                )}
              </div>
            )}

            {/* Business Name */}
            <div>
              <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="businessName">
                Restaurant / Business Name
              </label>
              <input
                id="businessName"
                type="text"
                {...register('businessName')}
                className={`w-full px-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                  errors.businessName 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                    : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                }`}
                placeholder="Mavora Coffee House"
              />
              {errors.businessName && <p className="text-red-500 text-[11px] mt-1.5">{errors.businessName.message}</p>}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register('firstName')}
                  className={`w-full px-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.firstName 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Jacob"
                />
                {errors.firstName && <p className="text-red-500 text-[11px] mt-1.5">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register('lastName')}
                  className={`w-full px-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                    errors.lastName 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                  }`}
                  placeholder="Mongeri"
                />
                {errors.lastName && <p className="text-red-500 text-[11px] mt-1.5">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="email">
                Admin Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`w-full px-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                  errors.email 
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/20' 
                    : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                }`}
                placeholder="admin@example.com"
              />
              {errors.email && <p className="text-red-600 text-[11px] font-semibold mt-1.5">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[13px] font-medium text-servora-navy mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className={`w-full px-3 py-2.5 text-sm bg-gray-50/50 border rounded-lg focus:outline-none focus:ring-4 focus:bg-white transition-all ${
                  errors.password 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                    : 'border-gray-200 focus:border-servora-core focus:ring-servora-core/10 hover:border-gray-300'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-[11px] mt-1.5">{errors.password.message}</p>}
            </div>

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