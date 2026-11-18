// apps/web/app/features/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hospitality & Restaurant Management Features | POS, KDS, Inventory & M-Pesa',
  description:
    'Explore Servora features by Mavora Technologies: cloud restaurant POS, Kitchen Display System (KDS), recipe BOM costing, supplier procurement, M-Pesa Daraja payments, staff shifts, and multi-branch reporting.',
  path: '/features',
  keywords: [
    'Hospitality Management Software Features',
    'Restaurant POS System Kenya',
    'Kitchen Display System KDS',
    'Restaurant Recipe Costing Software',
    'Hospitality Inventory Management',
    'M-Pesa Integrated POS System',
    'Multi-Branch Restaurant Management',
  ],
});

const FEATURES_FAQS = [
  {
    question: 'Does Servora deduct ingredient inventory automatically when an order is sold?',
    answer:
      'Yes. Menu items in Servora link to Bill of Materials (BOM) recipes with exact ingredient quantities, unit conversions (such as grams to kilograms or milliliters to liters), and wastage percentages. Every POS sale automatically deducts ingredient stock and records an immutable stock movement.',
  },
  {
    question: 'Can Servora route items from a single order to different kitchen and bar stations?',
    answer:
      'Yes. Servora supports multi-station Kitchen Display System (KDS) routing across Grill, Bar, Cold Pantry, Pastry, and Expediter screens, complete with target/warning/critical SLA timers, failover backup stations, and staff execution audit logs.',
  },
  {
    question: 'How does Servora handle procurement and supplier deliveries?',
    answer:
      'Servora includes an end-to-end procurement workflow covering department purchase requests, supplier purchase orders (POs), goods received notes (GRNs) with accepted/rejected quantity checks, supplier invoices, and vendor returns.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Features', path: '/features' },
          ]),
          buildFaqSchema(FEATURES_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- PREMIUM HERO SECTION --- */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-36 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/50 to-servora-pale">
          <div aria-hidden="true" className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl w-full max-w-7xl overflow-hidden pointer-events-none">
            <div 
              className="aspect-[1155/678] w-full bg-gradient-to-tr from-servora-core to-servora-bright opacity-10 rounded-full"
              style={{
                clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
              }}
            />
          </div>

          <div className="w-full max-w-7xl mx-auto flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">Platform Features</li>
              </ol>
            </nav>

            <div className="inline-flex items-center gap-x-2.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-servora-navy shadow-sm ring-1 ring-inset ring-servora-core/15 mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-servora-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-servora-teal" />
              </span>
              <span className="text-servora-teal uppercase tracking-widest text-[10px]">Unified Suite</span>
              <span className="text-gray-300">|</span>
              <span className="text-servora-deepTeal">Enterprise Hospitality Cloud OS</span>
            </div>

            <h1 className="w-full max-w-5xl text-4xl sm:text-6xl font-extrabold tracking-tight text-servora-navy leading-[1.1]">
              Engineered for Complete{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Hotel F&amp;B &amp; Restaurant Control
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base sm:text-xl leading-relaxed text-servora-deepTeal">
              {SITE_CONFIG.canonicalBrandDefinition} Explore every integrated module connecting front-of-house service, culinary stations, stockrooms, finance, and workforce operations.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-2xl bg-servora-core px-8 text-sm font-bold text-white shadow-xl shadow-servora-core/25 transition-all hover:bg-blue-700 hover:scale-[1.02]"
              >
                Request a Live Demo &rarr;
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-2xl border border-gray-200 bg-white px-8 text-sm font-bold text-servora-navy shadow-sm transition-all hover:border-servora-core hover:text-servora-core hover:scale-[1.02]"
              >
                View Pricing Plans
              </Link>
            </div>
          </div>
        </section>

        {/* --- SYSTEM CAPABILITY CONSOLE BANNER --- */}
        <section className="py-8 sm:py-12 w-full px-4 sm:px-8 lg:px-16 bg-servora-pale">
          <div className="w-full max-w-7xl mx-auto rounded-3xl bg-servora-navy p-6 sm:p-10 shadow-2xl ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-servora-core/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-bold text-servora-teal uppercase tracking-widest bg-servora-teal/20 px-3 py-1 rounded-full">
                  Architecture Overview
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-3">
                  Multi-Tenant Cloud + Offline Survivability
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-2xl leading-relaxed">
                  Servora combines lightning-fast local SQLite terminal queueing with secure cloud multi-branch synchronization, ensuring your restaurant never drops an order or payment even during internet outages.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-xs font-bold text-servora-navy shadow-md hover:bg-servora-pale transition-colors flex-shrink-0"
              >
                Speak to Engineering &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* --- CORE MODULES BENTO GRID SECTION --- */}
        <section className="py-20 w-full px-4 sm:px-8 lg:px-16 bg-white">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3 py-1 rounded-full">
                Core Platform Modules
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                Built for the Operational Realities of Modern Hospitality
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Module 1 */}
              <article className="flex flex-col justify-between rounded-3xl bg-servora-pale p-8 border border-gray-200/80 shadow-xs transition-all hover:border-servora-core hover:shadow-xl group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-servora-core flex items-center justify-center font-bold text-base mb-6 shadow-2xs group-hover:bg-servora-core group-hover:text-white transition-colors">
                    01
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    High-Speed Point of Sale (POS)
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Touch-optimized order entry supporting Dine-In, Takeaway, Delivery, and Bar Tabs. Configure custom modifiers, combo bundles, promotional codes, split tenders, and offline-resilient checkout.
                  </p>
                </div>
                <Link
                  href="/solutions/restaurants"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Restaurant POS Workflows &rarr;
                </Link>
              </article>

              {/* Module 2 */}
              <article className="flex flex-col justify-between rounded-3xl bg-servora-pale p-8 border border-gray-200/80 shadow-xs transition-all hover:border-servora-core hover:shadow-xl group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-servora-core flex items-center justify-center font-bold text-base mb-6 shadow-2xs group-hover:bg-servora-core group-hover:text-white transition-colors">
                    02
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Kitchen Display System (KDS) &amp; Routing
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Automatically split and route tickets across Grill, Bar, Cold Pantry, and Expediter screens. Enforce target/warning/critical cook SLAs, backup station failover, and full staff bump audit trails.
                  </p>
                </div>
                <Link
                  href="/solutions/cloud-kitchens"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Cloud Kitchen &amp; KDS Dispatch &rarr;
                </Link>
              </article>

              {/* Module 3 */}
              <article className="flex flex-col justify-between rounded-3xl bg-servora-pale p-8 border border-gray-200/80 shadow-xs transition-all hover:border-servora-core hover:shadow-xl group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-servora-core flex items-center justify-center font-bold text-base mb-6 shadow-2xs group-hover:bg-servora-core group-hover:text-white transition-colors">
                    03
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    M-Pesa Daraja &amp; Fiscal Compliance
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Trigger instant M-Pesa STK Push payment requests from the register and reconcile C2B Till/Paybill callbacks automatically, paired with 16% VAT, 2% Catering Levy, and KRA eTIMS invoicing.
                  </p>
                </div>
                <Link
                  href="/hardware-pos"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  POS Terminals &amp; Thermal Printers &rarr;
                </Link>
              </article>

              {/* Module 4 */}
              <article className="flex flex-col justify-between rounded-3xl bg-servora-pale p-8 border border-gray-200/80 shadow-xs transition-all hover:border-servora-core hover:shadow-xl group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-servora-core flex items-center justify-center font-bold text-base mb-6 shadow-2xs group-hover:bg-servora-core group-hover:text-white transition-colors">
                    04
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Recipe Costing &amp; Inventory Control
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Link every dish to a Bill of Materials (BOM) recipe for automatic stock deduction on sale. Track batch expiry dates, storage bins, blind cycle counts, waste logs, and theoretical vs. actual food cost.
                  </p>
                </div>
                <Link
                  href="/solutions/bars-lounges"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Bar Pour-Cost &amp; Stock Control &rarr;
                </Link>
              </article>

              {/* Module 5 */}
              <article className="flex flex-col justify-between rounded-3xl bg-servora-pale p-8 border border-gray-200/80 shadow-xs transition-all hover:border-servora-core hover:shadow-xl group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-servora-core flex items-center justify-center font-bold text-base mb-6 shadow-2xs group-hover:bg-servora-core group-hover:text-white transition-colors">
                    05
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Supplier Procurement &amp; Transfers
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Manage vendor directories, purchase requests, purchase orders (POs), goods received notes (GRNs), supplier invoices, and cold-chain inter-branch stock transfers across outlets.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Multi-Branch Supply Chain Demo &rarr;
                </Link>
              </article>

              {/* Module 6 */}
              <article className="flex flex-col justify-between rounded-3xl bg-servora-pale p-8 border border-gray-200/80 shadow-xs transition-all hover:border-servora-core hover:shadow-xl group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white text-servora-core flex items-center justify-center font-bold text-base mb-6 shadow-2xs group-hover:bg-servora-core group-hover:text-white transition-colors">
                    06
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Workforce, Cash Custody &amp; BI
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Enforce granular RBAC permissions, employee shift schedules, clock-in attendance, blind till reconciliations, manager shift handovers, and executive revenue and menu profitability analytics.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Compare Editions &amp; Seat Plans &rarr;
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* --- FEATURE FAQS (EXPANDABLE ACCORDION) --- */}
        <section className="py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Technical Insights
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                Technical &amp; Operational Feature Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={FEATURES_FAQS} />
          </div>
        </section>

        {/* --- FINAL CONVERSION CTA --- */}
        <section className="py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />
            
            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-6 ring-1 ring-inset ring-servora-teal/30">
              Get Started Today
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Ready to Experience Servora in Action?
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-10 leading-relaxed font-normal">
              Contact our Kilimani engineering and onboarding team to schedule a tailored walkthrough for your hotel F&amp;B or restaurant operations.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-2xl bg-white px-9 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale hover:scale-105"
              >
                Book Live Demo &rarr;
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-9 text-sm font-bold text-white transition-all hover:bg-white/20 hover:scale-105 backdrop-blur-xs"
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