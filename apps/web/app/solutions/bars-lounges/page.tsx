// apps/web/app/solutions/bars-lounges/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Bar & Lounge POS Software in Kenya | Tab Management & Pour Control | Servora',
  description:
    'High-speed bar and lounge POS software by Mavora Technologies. Manage open bar tabs, dedicated Bar KDS dispensing, M-Pesa STK push, blind cashier shift reconciliation, and bottle pour-cost inventory.',
  path: '/solutions/bars-lounges',
  keywords: [
    'Bar and Lounge POS Software Kenya',
    'Bar Tab Management Software Nairobi',
    'Pour Cost Inventory Tracking System',
    'Nightclub and Lounge POS Kenya',
    'M-Pesa Bar POS System',
  ],
});

const BARS_FAQS = [
  {
    question: 'How does Servora help bars and lounges prevent beverage shrinkage and spillage?',
    answer:
      'Servora links cocktails and measured pours to Bill of Materials (BOM) recipes in milliliters while tracking full bottles in units. Every drink rung up deducts exact stock automatically, allowing managers to run blind shift counts and audit theoretical vs. actual pour variance.',
  },
  {
    question: 'Can bartenders manage multiple open tabs and settle quickly with M-Pesa?',
    answer:
      'Yes. Staff can open named or table-linked bar tabs, route drink tickets directly to a dedicated Bar KDS screen, split bills across guests, and verify Safaricom M-Pesa STK Push or Till payments instantly at the counter.',
  },
];

export default function BarsLoungesSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Bars & Lounges', path: '/solutions/bars-lounges' },
          ]),
          buildFaqSchema(BARS_FAQS),
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
                <li className="font-bold text-servora-navy">Bars &amp; Lounges</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Hospitality Solutions &bull; Bars &amp; Lounges
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Bar &amp; Lounge POS Software for{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Fast Tabs &amp; Pour Control
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Keep service moving during peak lounge hours with open bar tabs, dedicated Bar KDS routing, instant Safaricom M-Pesa payment validation, blind cashier shift reconciliation, and bottle-level pour tracking.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Book a Bar POS Demo
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                Explore All Features
              </Link>
            </div>
          </div>
        </section>

        {/* --- CORE CAPABILITIES GRID --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Engineered for High-Energy Lounges &amp; Hotel Bars
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Built for Checkout Speed, Shift Custody &amp; Bottle Accuracy
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Open Bar Tabs &amp; Instant M-Pesa
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Link tabs to guest names or lounge tables, add rounds in seconds, split bills cleanly, and settle via cash, card, or instant M-Pesa STK Push during peak closing hours.
                  </p>
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
                    Promotions &amp; Cashier Shift Custody
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Run promotional discount codes with manager approval limits, enforce drawer cash caps, and verify every bartender and cashier shift through blind Z-read reconciliations.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Bottle &amp; Pour Stock Tracking
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Monitor spirit tot pours, cocktail recipes, bottled beers, and shrinkage in real time to eliminate variance between bar store transfers and actual POS sales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- BAR & LOUNGE FAQS --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-servora-navy text-center mb-8">
              Bar &amp; Lounge POS Questions
            </h2>
            <div className="space-y-4">
              {BARS_FAQS.map((faq) => (
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
                Ready to Upgrade Your Bar &amp; Lounge Operations?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani team via WhatsApp to schedule a live POS walkthrough tailored for bars, lounges, and hotel beverage outlets.
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