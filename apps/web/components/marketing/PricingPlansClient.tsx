// apps/web/components/marketing/PricingPlansClient.tsx
'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BILLING_OPTIONS,
  PRICING_PLANS,
  PLAN_COMPARISON_CATEGORIES,
  calculatePlanBilling,
  type BillingInterval,
  type PricingPlan,
} from '@/lib/pricing/plans';

interface CustomFeatureOption {
  id: string;
  label: string;
  category: string;
}

const CUSTOM_FEATURE_OPTIONS: CustomFeatureOption[] = [
  { id: 'pos-table-service', label: 'POS & Visual Table / Floor Management', category: 'Front of House' },
  { id: 'kds-station-routing', label: 'Kitchen Display System (KDS) & Station Routing', category: 'Kitchen' },
  { id: 'mpesa-daraja', label: 'Safaricom M-Pesa Daraja (STK Push & C2B)', category: 'Payments' },
  { id: 'recipe-bom', label: 'Recipe BOM & Automated Ingredient Deduction', category: 'Inventory' },
  { id: 'bar-tabs-pour', label: 'Open Bar Tabs & Milliliter Pour Control', category: 'Bar & Lounge' },
  { id: 'procurement-grn', label: 'Supplier Procurement, POs & GRNs', category: 'Back Office' },
  { id: 'multi-branch', label: 'Multi-Branch & Central Store Stock Transfers', category: 'Enterprise' },
  { id: 'kra-etims', label: 'Configurable Kenyan Tax & KRA eTIMS Readiness', category: 'Compliance' },
  { id: 'pos-hardware', label: 'Turnkey POS Hardware (Terminals, Printers, Drawers)', category: 'Hardware' },
];

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPlansClient() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [mobilePlanId, setMobilePlanId] = useState<PricingPlan['id']>('professional');

  // Custom Plan Builder State
  const [selectedCustomFeatures, setSelectedCustomFeatures] = useState<string[]>([
    'pos-table-service',
    'mpesa-daraja',
  ]);
  const [outletCount, setOutletCount] = useState<string>('1');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');

  const activeBilling =
    BILLING_OPTIONS.find((opt) => opt.id === billingInterval) ?? BILLING_OPTIONS[0];

  const toggleCustomFeature = (id: string) => {
    setCustomError('');
    setSelectedCustomFeatures((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedCustomFeatures.length === 0) {
      setCustomError('Please select at least one feature for your custom plan.');
      return;
    }

    const selectedLabels = CUSTOM_FEATURE_OPTIONS.filter((f) =>
      selectedCustomFeatures.includes(f.id)
    ).map((f) => f.label);

    const params = new URLSearchParams({
      plan: 'custom',
      billing: billingInterval,
      outlets: outletCount,
      features: selectedLabels.join(', '),
    });

    if (customNotes.trim()) {
      params.set('notes', customNotes.trim());
    }

    router.push(`/contact?${params.toString()}`);
  };

  return (
    <div id="plans" className="w-full scroll-mt-20">
      {/* --- INTERACTIVE BILLING SELECTOR --- */}
      <section className="py-8 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div
            role="group"
            aria-label="Choose billing interval"
            className="w-full sm:w-auto grid grid-cols-1 sm:inline-grid sm:grid-cols-3 p-1.5 rounded-2xl bg-white border border-gray-200/90 shadow-xs gap-1.5"
          >
            {BILLING_OPTIONS.map((option) => {
              const isActive = billingInterval === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBillingInterval(option.id)}
                  aria-pressed={isActive}
                  className={`px-5 py-3 rounded-xl text-left sm:text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-servora-core ${
                    isActive
                      ? 'bg-servora-navy text-white shadow-sm'
                      : 'text-servora-navy hover:bg-servora-pale/70'
                  }`}
                >
                  <div className="flex items-center justify-between sm:justify-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold">{option.label}</span>
                    {option.savingsBadge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-servora-teal text-white'
                            : 'bg-servora-teal/15 text-servora-teal'
                        }`}
                      >
                        {option.id === 'annual' ? '2 Mos Free' : '1 Mo Free'}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      isActive ? 'text-gray-300' : 'text-servora-deepTeal'
                    }`}
                  >
                    {option.shortNote}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs font-medium text-servora-deepTeal text-center max-w-xl">
            {activeBilling.summaryText}
          </p>
        </div>
      </section>

      {/* --- FOUR SUBSCRIPTION TIERS --- */}
      <section className="pb-12 sm:pb-16 pt-4 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const { billedTotal, effectiveMonthly, savingsAmount } = calculatePlanBilling(
              plan.monthlyPrice,
              billingInterval
            );

            return (
              <article
                key={plan.id}
                className={`relative rounded-3xl bg-white border p-6 sm:p-7 flex flex-col justify-between transition-all ${
                  plan.recommended
                    ? 'border-servora-core ring-2 ring-servora-core/20 shadow-lg'
                    : 'border-gray-200/90 shadow-xs hover:border-servora-core/50 hover:shadow-md'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-servora-core px-3.5 py-1 text-[10px] font-extrabold text-white uppercase tracking-widest shadow-xs whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-extrabold text-servora-navy">{plan.name}</h2>
                    <span className="text-[10px] font-mono font-bold text-servora-deepTeal bg-servora-pale px-2.5 py-1 rounded-full">
                      KES
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-servora-teal">
                    {plan.bestFor}
                  </p>

                  <p className="mt-3 text-xs text-servora-deepTeal leading-relaxed min-h-[48px]">
                    {plan.description}
                  </p>

                  {/* Price Block */}
                  <div className="mt-5 rounded-2xl bg-servora-pale/80 border border-gray-200/70 p-4">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold text-servora-navy font-mono tracking-tight">
                        KSh {billedTotal.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-servora-deepTeal">
                        / {billingInterval === 'monthly' ? 'mo' : billingInterval === 'biannual' ? '6 mos' : 'yr'}
                      </span>
                    </div>

                    {billingInterval === 'monthly' ? (
                      <p className="mt-1.5 text-[11px] text-servora-deepTeal">
                        Billed monthly in Kenyan Shillings
                      </p>
                    ) : (
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[11px] font-semibold text-servora-navy">
                          Equivalent to{' '}
                          <span className="font-mono text-servora-core">
                            KSh {effectiveMonthly.toLocaleString()}/month
                          </span>
                        </p>
                        <p className="text-[10px] font-mono font-bold text-emerald-700">
                          Save KSh {savingsAmount.toLocaleString()} vs. monthly billing
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="mt-6 space-y-3 text-xs text-servora-navy">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckIcon className="w-4 h-4 text-servora-teal flex-shrink-0 mt-0.5" />
                        <span className="leading-snug font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100">
                  <Link
                    href={`/contact?plan=${plan.id}&billing=${billingInterval}`}
                    className={`w-full inline-flex h-12 items-center justify-center rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-servora-core ${
                      plan.recommended
                        ? 'bg-servora-core text-white hover:bg-blue-700 shadow-md shadow-servora-core/20'
                        : 'bg-servora-navy text-white hover:bg-servora-core'
                    }`}
                  >
                    {plan.ctaLabel} &rarr;
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* --- CUSTOM PLAN & FEATURE BUILDER --- */}
      <section className="pb-16 sm:pb-24 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto rounded-3xl bg-white border border-gray-200/90 shadow-sm p-6 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <span className="inline-block rounded-full bg-servora-core/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-servora-core">
                Build Your Own Plan
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
                Need a Custom Configuration?
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-servora-deepTeal max-w-2xl">
                Select the exact Servora modules and hardware your venue needs, then submit your brief for a tailored KES quotation from our Nairobi team.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-servora-teal bg-servora-pale px-3.5 py-2 rounded-xl self-start lg:self-auto">
              {selectedCustomFeatures.length} module{selectedCustomFeatures.length === 1 ? '' : 's'} selected
            </span>
          </div>

          <form onSubmit={handleCustomSubmit} className="mt-6 space-y-6">
            {/* Selectable Feature Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CUSTOM_FEATURE_OPTIONS.map((item) => {
                const isSelected = selectedCustomFeatures.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCustomFeature(item.id)}
                    aria-pressed={isSelected}
                    className={`text-left rounded-2xl border p-4 transition-all cursor-pointer flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-servora-core ${
                      isSelected
                        ? 'bg-servora-core/5 border-servora-core ring-1 ring-servora-core/20'
                        : 'bg-servora-pale/50 border-gray-200/80 hover:border-servora-core/50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex w-5 h-5 rounded-md items-center justify-center flex-shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-servora-core border-servora-core text-white'
                          : 'bg-white border-gray-300 text-transparent'
                      }`}
                    >
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <div>
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-servora-teal font-bold">
                        {item.category}
                      </span>
                      <span className="block text-xs font-bold text-servora-navy mt-0.5 leading-snug">
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Outlets + Custom Notes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-4">
                <label
                  htmlFor="custom-outlets"
                  className="block text-xs font-bold text-servora-navy mb-1.5"
                >
                  Number of Outlets / Branches
                </label>
                <select
                  id="custom-outlets"
                  value={outletCount}
                  onChange={(e) => setOutletCount(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs font-semibold text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
                >
                  <option value="1">1 Outlet</option>
                  <option value="2-3">2 – 3 Outlets</option>
                  <option value="4-10">4 – 10 Outlets</option>
                  <option value="10+">10+ Outlets / Hospitality Group</option>
                </select>
              </div>

              <div className="md:col-span-8">
                <label
                  htmlFor="custom-notes"
                  className="block text-xs font-bold text-servora-navy mb-1.5"
                >
                  Additional Requirements (Optional)
                </label>
                <input
                  id="custom-notes"
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g., 2 POS terminals, 1 Bar KDS screen, M-Pesa Till integration..."
                  className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-4 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {customError && (
              <p role="alert" className="text-xs font-bold text-red-600">
                {customError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-[11px] text-servora-deepTeal">
                Your selected modules and <strong className="text-servora-navy">{activeBilling.label}</strong> billing preference will be pre-filled on the quote form.
              </p>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-md shadow-servora-core/20 hover:bg-blue-700 transition-colors cursor-pointer flex-shrink-0"
              >
                Submit Custom Plan Request &rarr;
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* --- PLAN COMPARISON SECTION --- */}
      <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
              Feature Breakdown
            </span>
            <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
              Compare Plans. Find Your Perfect Fit.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal">
              Explore the capabilities available at each subscription level and choose the operational tools that best match your business.
            </p>
          </div>

          {/* Mobile Plan-by-Plan Comparison */}
          <div className="md:hidden space-y-5">
            <div
              role="tablist"
              aria-label="Select plan to inspect features"
              className="grid grid-cols-2 gap-2"
            >
              {PRICING_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  role="tab"
                  aria-selected={mobilePlanId === plan.id}
                  onClick={() => setMobilePlanId(plan.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    mobilePlanId === plan.id
                      ? 'bg-servora-navy text-white border-servora-navy'
                      : 'bg-servora-pale text-servora-navy border-gray-200'
                  }`}
                >
                  {plan.name}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
              {PLAN_COMPARISON_CATEGORIES.map((group) => (
                <div key={group.category} className="p-4">
                  <h3 className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-servora-core mb-3">
                    {group.category}
                  </h3>
                  <ul className="space-y-2.5 text-xs">
                    {group.rows.map((row) => {
                      const included = row[mobilePlanId];
                      return (
                        <li
                          key={row.feature}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-servora-navy font-medium">{row.feature}</span>
                          {included ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex-shrink-0"
                              aria-label="Included"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              className="text-gray-300 font-bold flex-shrink-0"
                              aria-label="Not included"
                            >
                              &mdash;
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop & Tablet Comparison Table */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-gray-200/90 shadow-xs bg-white">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-servora-pale border-b border-gray-200 text-servora-navy text-xs font-extrabold">
                  <th scope="col" className="py-4 px-6 w-2/5">
                    Operational Capability
                  </th>
                  <th scope="col" className="py-4 px-4 text-center">
                    Starter
                  </th>
                  <th scope="col" className="py-4 px-4 text-center">
                    Business
                  </th>
                  <th
                    scope="col"
                    className="py-4 px-4 text-center bg-servora-core/10 text-servora-core"
                  >
                    Professional
                  </th>
                  <th scope="col" className="py-4 px-4 text-center">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-servora-deepTeal">
                {PLAN_COMPARISON_CATEGORIES.map((group) => (
                  <Fragment key={group.category}>
                    <tr className="bg-gray-50/80">
                      <th
                        colSpan={5}
                        scope="colgroup"
                        className="py-3 px-6 font-extrabold uppercase tracking-wider text-[11px] text-servora-navy font-mono"
                      >
                        {group.category}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.feature} className="hover:bg-servora-pale/30 transition-colors">
                        <th scope="row" className="py-3.5 px-6 font-semibold text-servora-navy">
                          {row.feature}
                        </th>
                        <td className="py-3.5 px-4 text-center">
                          {row.starter ? (
                            <span
                              className="inline-flex w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 items-center justify-center mx-auto"
                              aria-label="Included"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-gray-300" aria-label="Not included">
                              &mdash;
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.business ? (
                            <span
                              className="inline-flex w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 items-center justify-center mx-auto"
                              aria-label="Included"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-gray-300" aria-label="Not included">
                              &mdash;
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center bg-servora-core/5">
                          {row.professional ? (
                            <span
                              className="inline-flex w-6 h-6 rounded-full bg-servora-core text-white items-center justify-center mx-auto shadow-2xs"
                              aria-label="Included"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-gray-300" aria-label="Not included">
                              &mdash;
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.enterprise ? (
                            <span
                              className="inline-flex w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 items-center justify-center mx-auto"
                              aria-label="Included"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-gray-300" aria-label="Not included">
                              &mdash;
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}