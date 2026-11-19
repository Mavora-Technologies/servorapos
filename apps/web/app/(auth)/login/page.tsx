// apps/web/app/login/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginClient from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In to Servora | Restaurant & Hospitality Management',
  description:
    'Securely sign in to your Servora account to manage restaurant operations, orders, inventory, and business performance.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-servora-pale text-xs font-semibold text-servora-deepTeal">
          Loading Servora sign in...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}