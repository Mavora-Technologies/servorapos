// apps/web/app/solutions/cloud-kitchens/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cloud Kitchen & Dark Kitchen Management Software in Kenya | Servora',
  description:
    'Cloud kitchen and dark kitchen POS software by Mavora Technologies. Unify delivery, takeaway, and online orders into station-routed Kitchen Display Systems (KDS) with automated recipe BOM stock deduction.',
  path: '/solutions/cloud-kitchens',
  keywords: [
    'Cloud Kitchen Software Kenya',
    'Dark Kitchen Management System Nairobi',
    'Kitchen Display System KDS Kenya',
    'Multi-Brand Restaurant Software',
    'Delivery and Takeaway POS System',
  ],
});

const CLOUD_KITCHEN_FAQS = [
  {
    question: 'How does Servora support cloud kitchens and multi-brand dark kitchens?',
    answer:
      'Servora consolidates direct online orders, takeaway counter tickets, and delivery dispatches into a unified Kitchen Display System (KDS). Items are automatically routed to dedicated prep stations (Grill, Fryer, Cold Pantry, Packaging) while deducting shared ingredients from a single central inventory.',
  },
  {
    question: 'Can cloud kitchens track cook times and rider dispatch SLAs in Servora?',
    answer:
      'Yes. Every ticket on the Servora KDS tracks station-level target, warning, and critical cook thresholds, logs which team member fired and bumped each order, and records full preparation and fulfillment SLA analytics.',
  },
];

export default function CloudKitchensSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Cloud Kitchens', path: '/solutions/cloud-kitchens' },
          ]),
          buildFaqSchema(CLOUD_KITCHEN_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">Cloud Kitchens</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Hospitality Solutions &bull; Cloud Kitchens &amp; Dark Kitchens
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Cloud Kitchen Software for{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                High-Velocity Kitchen Dispatch
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Unify delivery dispatches, online orders, and express takeaway into a single Kitchen Display System (KDS). Optimize station prep SLAs and automate recipe stock control across your virtual brands.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Request Cloud Kitchen Demo
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                View Software Plans
              </Link>
            </div>
          </div>
        </section>

        {/* --- VIRTUAL BRAND ARCHITECTURE BANNER --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <span className="inline-flex items-center rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-3">
                Virtual Brand &amp; Central Commissary Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-3">
                Operate Multiple Delivery Concepts From One Kitchen Hub
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-2xl">
                Run multiple delivery-focused menus out of a single production kitchen. Servora automatically routes line items to designated prep stations while consolidating ingredient deductions down to the exact gram.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-servora-navy">Centralized Delivery &amp; Online Queue</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-servora-navy">Station-Routed Kitchen Display (KDS)</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-servora-navy">Automated BOM Stock &amp; Recipe Costing</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- CAPABILITIES GRID SECTION --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Optimized for High-Volume Prep &amp; Dispatch
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Core Cloud Kitchen Capabilities
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Multi-Channel Order Aggregation
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Bring online storefront orders, takeaway counter tickets, and delivery dispatches into one unified order pipeline with M-Pesa payment verification.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Unified dispatch &amp; rider handoff queue</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Packing charge &amp; delivery fee rules</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">
                    High Velocity Ready
                  </span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Kitchen Display System (KDS)
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Replace paper tickets with color-coded digital screens that track preparation times, SLA delay alerts, and expediter assembly queues.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Station routing (Grill, Prep, Cold, Bar)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Cook speed &amp; staff custody audit log</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">
                    Zero Paper Waste
                  </span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Live Inventory &amp; Wastage Control
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Monitor ingredient levels across shared production kitchens. Automatically deduct recipe ingredients per order and flag low stock immediately.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Recipe-level BOM consumption</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Low-stock reorder &amp; batch expiry alerts</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">
                    Precision Control
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- CLOUD KITCHEN FAQS --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-servora-navy text-center mb-8">
              Cloud Kitchen &amp; KDS Questions
            </h2>
            <div className="space-y-4">
              {CLOUD_KITCHEN_FAQS.map((faq) => (
                <article
                  key={faq.question}
                  className="rounded-2xl bg-servora-pale border border-gray-200 p-6"
                >
                  <h3 className="text-base font-bold text-servora-navy">{faq.question}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- CALL TO ACTION BANNER --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-block rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-2">
                Get Started Today
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Ready to Scale Your Cloud Kitchen Operations?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani team via WhatsApp to outline your virtual brands, prep stations, and delivery dispatch workflows.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Contact Sales Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}