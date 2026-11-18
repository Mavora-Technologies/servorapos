// apps/web/components/marketing/PricingPlansClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type BillingCycle = 'monthly' | 'biannual' | 'annual';

export default function PricingPlansClient() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const getPrice = (monthlyBase: number) => {
    if (billingCycle === 'annual') {
      return (monthlyBase * 10).toLocaleString();
    }
    if (billingCycle === 'biannual') {
      return (monthlyBase * 5).toLocaleString();
    }
    return monthlyBase.toLocaleString();
  };

  const getBillingSuffix = () => {
    if (billingCycle === 'annual') return '/ year';
    if (billingCycle === 'biannual') return '/ 6 mos';
    return '/ month';
  };

  return (
    <>
      {/* Interactive Billing Toggle */}
      <div className="flex justify-center pb-8 bg-white border-b border-gray-100 px-4">
        <div
          role="group"
          aria-label="Billing Cycle Selection"
          className="inline-flex items-center rounded-xl bg-servora-pale p-1.5 border border-gray-200 shadow-inner"
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-lg px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-servora-core text-white shadow-md'
                : 'text-servora-navy hover:text-servora-core'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('biannual')}
            className={`rounded-lg px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'biannual'
                ? 'bg-servora-core text-white shadow-md'
                : 'text-servora-navy hover:text-servora-core'
            }`}
          >
            Bi-Annual <span className="text-[10px] opacity-80">(6 Mos)</span>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`rounded-lg px-5 py-2 text-xs font-bold transition-all relative cursor-pointer ${
              billingCycle === 'annual'
                ? 'bg-servora-core text-white shadow-md'
                : 'text-servora-navy hover:text-servora-core'
            }`}
          >
            Annual <span className="text-[10px] text-servora-teal font-extrabold ml-1">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Starter Tier */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg relative">
            <div>
              <div className="inline-block rounded-md bg-servora-pale px-2.5 py-1 text-[11px] font-bold text-servora-core mb-4">
                STARTER
              </div>
              <h2 className="text-xl font-extrabold text-servora-navy mb-1">Single Outlet</h2>
              <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                Core POS &amp; inventory management for independent cafés and quick-service spots.
              </p>
              <div className="mb-6 pb-6 border-b border-gray-100">
                <span className="text-3xl font-extrabold text-servora-navy font-mono">
                  KSh {getPrice(2500)}
                </span>
                <span className="text-xs text-servora-deepTeal ml-1">{getBillingSuffix()}</span>
              </div>
              <ul className="flex flex-col gap-3 text-xs text-servora-deepTeal">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Core POS &amp; Checkout</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Basic Inventory Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>1 Terminal Connection</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Standard Email Support</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="w-full flex h-10 items-center justify-center rounded-lg border border-servora-core text-servora-core font-semibold text-xs transition-all hover:bg-servora-core hover:text-white"
              >
                Request Starter Setup
              </Link>
            </div>
          </div>

          {/* Business Tier (Highlighted) */}
          <div className="flex flex-col justify-between rounded-2xl bg-servora-navy p-8 border-2 border-servora-core shadow-xl relative text-white">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-servora-core text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
              Most Popular
            </div>
            <div>
              <div className="inline-block rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold text-servora-teal mb-4">
                BUSINESS
              </div>
              <h2 className="text-xl font-extrabold text-white mb-1">Growing Restaurant</h2>
              <p className="text-xs text-servora-pale/80 leading-relaxed mb-6">
                Multi-user operations for busy sit-down restaurants, bars, and bistros.
              </p>
              <div className="mb-6 pb-6 border-b border-white/10">
                <span className="text-3xl font-extrabold text-white font-mono">
                  KSh {getPrice(4500)}
                </span>
                <span className="text-xs text-servora-pale/70 ml-1">{getBillingSuffix()}</span>
              </div>
              <ul className="flex flex-col gap-3 text-xs text-servora-pale/90">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multi-User Operations</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Kitchen Display System (KDS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Safaricom M-Pesa Daraja Integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Cashier Shift Reconciliation</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="w-full flex h-10 items-center justify-center rounded-lg bg-servora-core text-white font-semibold text-xs shadow-md transition-all hover:bg-blue-600"
              >
                Book Business Demo
              </Link>
            </div>
          </div>

          {/* Professional Tier */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg relative">
            <div>
              <div className="inline-block rounded-md bg-servora-pale px-2.5 py-1 text-[11px] font-bold text-servora-core mb-4">
                PROFESSIONAL
              </div>
              <h2 className="text-xl font-extrabold text-servora-navy mb-1">Advanced Venue</h2>
              <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                Advanced reporting, recipe costing, and deep analytics for high-volume venues.
              </p>
              <div className="mb-6 pb-6 border-b border-gray-100">
                <span className="text-3xl font-extrabold text-servora-navy font-mono">
                  KSh {getPrice(8000)}
                </span>
                <span className="text-xs text-servora-deepTeal ml-1">{getBillingSuffix()}</span>
              </div>
              <ul className="flex flex-col gap-3 text-xs text-servora-deepTeal">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Advanced Reporting &amp; Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Recipe &amp; Food Costing Engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Waste &amp; Spoilage Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Priority 24/7 Support</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="w-full flex h-10 items-center justify-center rounded-lg border border-servora-core text-servora-core font-semibold text-xs transition-all hover:bg-servora-core hover:text-white"
              >
                Request Professional Setup
              </Link>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg relative">
            <div>
              <div className="inline-block rounded-md bg-servora-pale px-2.5 py-1 text-[11px] font-bold text-servora-core mb-4">
                ENTERPRISE
              </div>
              <h2 className="text-xl font-extrabold text-servora-navy mb-1">Hospitality Group</h2>
              <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                Multi-branch management, centralized procurement, and custom integrations.
              </p>
              <div className="mb-6 pb-6 border-b border-gray-100">
                <span className="text-3xl font-extrabold text-servora-navy font-mono">
                  KSh {getPrice(15000)}
                </span>
                <span className="text-xs text-servora-deepTeal ml-1">{getBillingSuffix()}</span>
              </div>
              <ul className="flex flex-col gap-3 text-xs text-servora-deepTeal">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multi-Branch &amp; Hotel F&amp;B Management</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Centralized Procurement &amp; Suppliers</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Dedicated Account Manager</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Custom API &amp; ERP Integrations</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="w-full flex h-10 items-center justify-center rounded-lg border border-servora-core text-servora-core font-semibold text-xs transition-all hover:bg-servora-core hover:text-white"
              >
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}