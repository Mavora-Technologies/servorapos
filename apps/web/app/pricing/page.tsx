"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

type BillingCycle = "monthly" | "biannual" | "annual";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  // Multiplier logic based on billing cycle selection
  // Annual offers a discount equivalent to ~2 months free (10x monthly rate)
  // Bi-annual offers a proportional rate (5x monthly rate for 6 months)
  const getPrice = (monthlyBase: number) => {
    if (billingCycle === "annual") {
      return (monthlyBase * 10).toLocaleString(); // e.g. 2,500 * 10 = 25,000 for 12 months
    }
    if (billingCycle === "biannual") {
      return (monthlyBase * 5).toLocaleString(); // e.g. 2,500 * 5 = 12,500 for 6 months
    }
    return monthlyBase.toLocaleString(); // Monthly base
  };

  const getBillingSuffix = () => {
    if (billingCycle === "annual") return "/ year";
    if (billingCycle === "biannual") return "/ 6 mos";
    return "/ month";
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        
        {/* --- HERO & BILLING TOGGLE --- */}
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-20 sm:pb-16 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Transparent SaaS Plans
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Simple Pricing for Every Restaurant Size
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Choose the ideal tier for your single-outlet café, bar, or multi-branch restaurant group. Scale resources seamlessly as your operations expand.
            </p>

            {/* Interactive Billing Toggle */}
            <div className="mt-8 inline-flex items-center rounded-xl bg-servora-pale p-1.5 border border-gray-200 shadow-inner">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-servora-core text-white shadow-md"
                    : "text-servora-navy hover:text-servora-core"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("biannual")}
                className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                  billingCycle === "biannual"
                    ? "bg-servora-core text-white shadow-md"
                    : "text-servora-navy hover:text-servora-core"
                }`}
              >
                Bi-Annual <span className="text-[10px] opacity-80">(6 Mos)</span>
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`rounded-lg px-5 py-2 text-xs font-bold transition-all relative ${
                  billingCycle === "annual"
                    ? "bg-servora-core text-white shadow-md"
                    : "text-servora-navy hover:text-servora-core"
                }`}
              >
                Annual <span className="text-[10px] text-servora-teal font-extrabold ml-1">Save 17%</span>
              </button>
            </div>
          </div>
        </section>

        {/* --- PRICING CARDS GRID --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Starter Tier */}
            <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg relative">
              <div>
                <div className="inline-block rounded-md bg-servora-pale px-2.5 py-1 text-[11px] font-bold text-servora-core mb-4">
                  STARTER
                </div>
                <h3 className="text-xl font-extrabold text-servora-navy mb-1">Single Outlet</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                  Core POS & inventory management for independent cafés and quick-service spots.
                </p>
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <span className="text-3xl font-extrabold text-servora-navy font-mono">
                    KSh {getPrice(2500)}
                  </span>
                  <span className="text-xs text-servora-deepTeal ml-1">{getBillingSuffix()}</span>
                </div>
                <ul className="flex flex-col gap-3 text-xs text-servora-deepTeal">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Core POS & Checkout</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Basic Inventory Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>1 Terminal Connection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Standard Email Support</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full flex h-10 items-center justify-center rounded-lg border border-servora-core text-servora-core font-semibold text-xs transition-all hover:bg-servora-core hover:text-white"
                >
                  Get Started
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
                <h3 className="text-xl font-extrabold text-white mb-1">Growing Restaurant</h3>
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
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Multi-User Operations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Kitchen Display System (KDS)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>M-Pesa Daraja Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Shift Reconciliation</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full flex h-10 items-center justify-center rounded-lg bg-servora-core text-white font-semibold text-xs shadow-md transition-all hover:bg-blue-600"
                >
                  Start Business Trial
                </Link>
              </div>
            </div>

            {/* Professional Tier */}
            <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg relative">
              <div>
                <div className="inline-block rounded-md bg-servora-pale px-2.5 py-1 text-[11px] font-bold text-servora-core mb-4">
                  PROFESSIONAL
                </div>
                <h3 className="text-xl font-extrabold text-servora-navy mb-1">Advanced Venue</h3>
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
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Advanced Reporting & Analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Recipe & Food Costing Engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Waste & Spoilage Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Priority 24/7 Support</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full flex h-10 items-center justify-center rounded-lg border border-servora-core text-servora-core font-semibold text-xs transition-all hover:bg-servora-core hover:text-white"
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* Enterprise Tier */}
            <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg relative">
              <div>
                <div className="inline-block rounded-md bg-servora-pale px-2.5 py-1 text-[11px] font-bold text-servora-core mb-4">
                  ENTERPRISE
                </div>
                <h3 className="text-xl font-extrabold text-servora-navy mb-1">Restaurant Group</h3>
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
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Multi-Branch Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Centralized Procurement & Suppliers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Dedicated Account Manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    <span>Custom API & ERP Integrations</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="w-full flex h-10 items-center justify-center rounded-lg border border-servora-core text-servora-core font-semibold text-xs transition-all hover:bg-servora-core hover:text-white"
                >
                  Contact Sales
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* --- FAQ / TRUST BANNER --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-4xl mx-auto text-center">
            <h2 className="text-xs font-bold text-servora-teal uppercase tracking-widest mb-2">Flexible & Transparent</h2>
            <h3 className="text-2xl font-bold text-servora-navy mb-4">Frequently Asked Questions</h3>
            <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-8">
              Need help deciding which plan fits your branch setup? Reach out to our Kilimani office or explore our hardware bundles.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Speak with Sales
              </Link>
              <Link
                href="/hardware-pos"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-7 text-sm font-semibold text-servora-navy hover:border-servora-core"
              >
                View POS Hardware Setup
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}