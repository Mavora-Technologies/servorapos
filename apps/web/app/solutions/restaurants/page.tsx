// apps/web/app/solutions/restaurants/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Restaurant & Café Management Software in Kenya | POS & Table Service | Servora',
  description:
    'Complete restaurant and café management software by Mavora Technologies. Visual table and floor management, custom modifiers, split billing, KDS kitchen routing, recipe costing, and M-Pesa Daraja payments.',
  path: '/solutions/restaurants',
  keywords: [
    'Restaurant Management Software Kenya',
    'Restaurant POS System Nairobi',
    'Table Management Software for Restaurants',
    'Cafe and Coffee Shop POS Kenya',
    'Split Bill POS System with M-Pesa',
  ],
});

const RESTAURANTS_FAQS = [
  {
    question: 'How does Servora streamline dining room and table service for restaurants?',
    answer:
      'Servora gives servers and hosts a live visual floor plan showing vacant, occupied, reserved, and cleaning tables, alongside waitlist management, server assignments, course modifiers, and instant kitchen ticket routing.',
  },
  {
    question: 'Can guests split restaurant bills across cash, card, and M-Pesa?',
    answer:
      'Yes. Cashiers and waiters can split bills by item or equal share across multiple payment methods—including cash, card, and Safaricom M-Pesa STK Push—while issuing KRA eTIMS-ready fiscal receipts.',
  },
];

export default function RestaurantsSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Restaurants & Cafés', path: '/solutions/restaurants' },
          ]),
          buildFaqSchema(RESTAURANTS_FAQS),
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
                <li className="font-bold text-servora-navy">Restaurants &amp; Cafés</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Hospitality Solutions &bull; Restaurants, Cafés &amp; Hotel Dining
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Restaurant Management Software for{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                High-Speed Table &amp; POS Service
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Empower your front-of-house and culinary teams with visual table management, reservations, split billing, custom menu modifiers, station-routed KDS screens, and real-time recipe costing.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Book a Restaurant Demo
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                Explore All Modules
              </Link>
            </div>
          </div>
        </section>

        {/* --- CORE CAPABILITIES GRID --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Designed for Dine-In, Cafés &amp; Quick Service
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Everything Your Restaurant Needs to Deliver Faster Service
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Visual Floor, Table &amp; Reservation Control
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Manage indoor and terrace seating layouts, track live table turnover timers, assign waiters, and manage guest reservations and walk-in waitlists seamlessly.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Modifiers, Meal Combos &amp; Recipe Costing
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Configure portion sizes, preparation doneness, sides, and combo meals with automatic ingredient BOM deductions and live food cost margin tracking.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Split Bills &amp; M-Pesa Daraja Integration
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Split guest checks effortlessly across cash, cards, and official Safaricom M-Pesa Daraja STK Push with instant payment confirmation and KRA eTIMS readiness.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- RESTAURANTS FAQS --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-servora-navy text-center mb-8">
              Restaurant &amp; Café POS Questions
            </h2>
            <div className="space-y-4">
              {RESTAURANTS_FAQS.map((faq) => (
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
                Ready to Modernize Your Restaurant Service?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Connect with Mavora Technologies in Kilimani, Nairobi via WhatsApp to schedule a personalized walkthrough for your restaurant or café.
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