// apps/web/app/solutions/hotels/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hotel F&B, Restaurant & Outlets Management Software | Servora Kenya',
  description:
    'Hotel food and beverage, restaurant, bar, and room-service POS software by Mavora Technologies in Nairobi. Manage multi-outlet dining, lounge tabs, central inventory transfers, and consolidated reporting.',
  path: '/solutions/hotels',
  keywords: [
    'Hotel Restaurant Management Software Kenya',
    'Hotel F&B POS System Nairobi',
    'Hotel Room Service POS Software',
    'Multi-Outlet Hospitality Management Platform',
    'Servora Hotel Solutions',
  ],
});

const HOTEL_FAQS = [
  {
    question: 'How does Servora support hotels and hospitality groups?',
    answer:
      'Servora empowers hotels to manage their food and beverage operations seamlessly—including main dining room POS, hotel bars, poolside lounges, room service order tracking, banquets, central store stock transfers, and multi-outlet financial reconciliation.',
  },
  {
    question: 'Does Servora include a full Room Property Management System (PMS)?',
    answer:
      'Servora specializes in hotel F&B, restaurant operations, inventory, and point of sale. While full room-reservation and housekeeping PMS modules are on our future product roadmap, hospitality groups currently deploy Servora alongside their front-office PMS to handle all dining, bar, and revenue reporting.',
  },
];

export default function HotelsSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Hotel F&B & Outlets', path: '/solutions/hotels' },
          ]),
          buildFaqSchema(HOTEL_FAQS),
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
                <li className="font-bold text-servora-navy">Hotel F&amp;B &amp; Outlets</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Hospitality Solutions &bull; Hotels, Resorts &amp; Lodges
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Hotel F&amp;B &amp; Outlet POS Software for{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Multi-Property Hospitality Groups
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Unify your hotel’s main dining room, lobby bar, poolside lounge, banquet events, and room-service ordering under one robust cloud platform with centralized stock transfers and executive reporting.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Request Hotel F&amp;B Demo
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                Explore Platform Features
              </Link>
            </div>
          </div>
        </section>

        {/* --- CORE CAPABILITIES GRID --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Engineered for Hospitality Groups
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Connected Operations Across Every Hotel Revenue Center
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Multi-Outlet &amp; Venue Management
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Operate distinct menus and cashier drawers for your fine dining restaurant, rooftop lounge, and conference catering from a single tenant dashboard.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Central Store Stock Transfers
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Manage your central warehouse or main hotel store, issue stock requisitions to bar and kitchen sub-stores, and audit transfers across departments.
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
                    Consolidated Executive Analytics
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    View roll-up gross revenue, food cost percentages, labor costs, and cashier shift reconciliations across all hotel profit centers instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- HOTEL FAQS --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-servora-navy text-center mb-8">
              Hotel F&amp;B Software Questions
            </h2>
            <div className="space-y-4">
              {HOTEL_FAQS.map((faq) => (
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
                Ready to Upgrade Your Hotel F&amp;B Operations?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani team via WhatsApp to discuss your hotel’s outlets, stock workflows, and POS terminal requirements.
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