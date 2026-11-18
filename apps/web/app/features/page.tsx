// apps/web/app/features/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
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
        {/* --- BREADCRUMB & HERO SECTION --- */}
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
                <li className="font-bold text-servora-navy">Platform Features</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Unified Hospitality Operations Suite
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Engineered for Complete{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Hotel F&amp;B &amp; Restaurant Control
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              {SITE_CONFIG.canonicalBrandDefinition} Explore every integrated module connecting front-of-house service, culinary stations, stockrooms, finance, and workforce operations.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Request a Live Demo
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                View Pricing Plans
              </Link>
            </div>
          </div>
        </section>

        {/* --- CORE MODULES GRID SECTION --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Core Platform Modules
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Built for the Operational Realities of Kenyan &amp; East African Hospitality
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Module 1 */}
              <article className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    High-Speed Point of Sale (POS)
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-4">
                    Touch-optimized order entry supporting Dine-In, Takeaway, Delivery, and Bar Tabs. Configure custom modifiers, combo bundles, promotional codes, split tenders, and offline-resilient checkout.
                  </p>
                </div>
                <Link
                  href="/solutions/restaurants"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  Restaurant POS Workflows &rarr;
                </Link>
              </article>

              {/* Module 2 */}
              <article className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Kitchen Display System (KDS) &amp; Station Routing
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-4">
                    Automatically split and route tickets across Grill, Bar, Cold Pantry, and Expediter screens. Enforce target/warning/critical cook SLAs, backup station failover, and full staff bump audit trails.
                  </p>
                </div>
                <Link
                  href="/solutions/cloud-kitchens"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  Cloud Kitchen &amp; KDS Dispatch &rarr;
                </Link>
              </article>

              {/* Module 3 */}
              <article className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Safaricom M-Pesa Daraja &amp; Fiscal Compliance
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-4">
                    Trigger instant M-Pesa STK Push payment requests from the register and reconcile C2B Till/Paybill callbacks automatically, paired with 16% VAT, 2% Catering Levy, and KRA eTIMS invoicing.
                  </p>
                </div>
                <Link
                  href="/hardware-pos"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  POS Terminals &amp; Thermal Printers &rarr;
                </Link>
              </article>

              {/* Module 4 */}
              <article className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Recipe Costing &amp; Inventory Control
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-4">
                    Link every dish to a Bill of Materials (BOM) recipe for automatic stock deduction on sale. Track batch expiry dates, storage bins, blind cycle counts, waste logs, and theoretical vs. actual food cost.
                  </p>
                </div>
                <Link
                  href="/solutions/bars-lounges"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  Bar Pour-Cost &amp; Stock Control &rarr;
                </Link>
              </article>

              {/* Module 5 */}
              <article className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    05
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Supplier Procurement &amp; Inter-Branch Transfers
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-4">
                    Manage vendor directories, purchase requests, purchase orders (POs), goods received notes (GRNs), supplier invoices, and cold-chain inter-branch stock transfers across outlets.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  Multi-Branch Supply Chain Demo &rarr;
                </Link>
              </article>

              {/* Module 6 */}
              <article className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    06
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Workforce Shifts, Cash Custody &amp; BI Analytics
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-4">
                    Enforce granular RBAC permissions, employee shift schedules, clock-in attendance, blind till reconciliations, manager shift handovers, and executive revenue and menu profitability analytics.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  Compare Editions &amp; Seat Plans &rarr;
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* --- FEATURE FAQS (AEO / GEO) --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-servora-navy text-center mb-8">
              Technical &amp; Operational Feature Questions
            </h2>
            <div className="space-y-4">
              {FEATURES_FAQS.map((faq) => (
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
                Ready to Experience Servora in Action?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani engineering and onboarding team to schedule a tailored walkthrough for your hotel F&amp;B or restaurant operations.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Book Live Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}