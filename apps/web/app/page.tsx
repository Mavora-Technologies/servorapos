// apps/web/app/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hotel & Restaurant Management System | Servora Kenya',
  description:
    'Manage hotel and restaurant operations with Servora. Streamline reservations, POS sales, orders, inventory, payments, and business reporting from one integrated platform.',
  path: '/',
  keywords: [
    'Hotel and Restaurant Management System',
    'Restaurant POS System Kenya',
    'Hospitality Management Software Kenya',
    'M-Pesa Integrated POS System',
    'Restaurant Inventory Management Software',
    'Kitchen Display System KDS',
    'Servora by Mavora Technologies',
  ],
});

const HOMEPAGE_FAQS = [
  {
    question: 'What is Servora and who developed it?',
    answer:
      'Servora is a hotel, restaurant, and hospitality management platform developed by Mavora Technologies Ltd in Nairobi, Kenya[cite: 3]. It helps hospitality businesses streamline daily operations through integrated management of POS sales, orders, table reservations, kitchen display routing, inventory, procurement, M-Pesa payments, staff shifts, and executive reporting.',
  },
  {
    question: 'Which hospitality businesses can use Servora?',
    answer:
      'Servora is built for restaurants, cafés, coffee shops, bars and lounges, fast-food outlets, bakeries, grill houses, cloud kitchens, multi-branch restaurant chains, and hotel food-and-beverage outlets across Kenya, East Africa, and international markets.',
  },
  {
    question: 'Does Servora support Safaricom M-Pesa and KRA eTIMS compliance in Kenya?',
    answer:
      'Yes. Servora integrates natively with Safaricom M-Pesa Daraja for instant STK Push prompts and C2B till callback reconciliation, alongside KES currency support, cashier shift custody tracking, and KRA eTIMS fiscal invoice readiness.',
  },
  {
    question: 'How does Servora control recipe costs and kitchen inventory?',
    answer:
      'Every menu item can be mapped to a Bill of Materials (BOM) recipe with ingredient units and wastage percentages. Whenever an order is confirmed at the POS, Servora automatically deducts exact ingredient quantities from stock, updates batch balances, flags low-stock thresholds, and calculates real-time food cost margins.',
  },
  {
    question: 'Can Servora manage multiple branches and kitchen prep stations?',
    answer:
      'Yes. Servora provides multi-branch tenant isolation so hospitality groups can manage separate outlets, cash drawers, stock transfers, and branch-specific Kitchen Display System (KDS) stations such as Grill, Bar, Cold Pantry, and Expediter screens from a single central workspace.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd data={buildFaqSchema(HOMEPAGE_FAQS)} />
      <Header />

      <main className="flex-grow w-full">
        {/* --- MINIMIZED PREMIUM HERO SECTION --- */}
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/50 to-servora-pale">
          <div aria-hidden="true" className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl w-full max-w-7xl overflow-hidden pointer-events-none">
            <div 
              className="aspect-[1155/678] w-full bg-gradient-to-tr from-servora-core to-servora-bright opacity-10 rounded-full"
              style={{
                clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
              }}
            />
          </div>

          <div className="w-full max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-x-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-servora-navy shadow-sm ring-1 ring-inset ring-servora-core/15 mb-5 transition-transform hover:scale-105 duration-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-servora-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-servora-teal" />
              </span>
              <span className="text-servora-teal uppercase tracking-widest text-[10px]">Servora 2.0</span>
              <span className="text-gray-300">|</span>
              <span className="text-servora-deepTeal">Smart Hospitality Management by Mavora Technologies[cite: 3]</span>
            </div>

            {/* Headline */}
            <h1 className="w-full max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-servora-navy leading-[1.15]">
              Complete Hotel &amp; Restaurant Management.<br className="hidden sm:inline" />{" "}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                All in One Platform.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-servora-deepTeal font-normal">
              Run your hospitality business smarter with Servora. Connect POS sales, restaurant operations, kitchen workflows, inventory, procurement, payments, and business intelligence through one integrated management platform.
            </p>

            {/* CTA Group */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-xl bg-servora-core px-7 text-xs font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                Request a Live Demo &rarr;
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs font-bold text-servora-navy shadow-xs transition-all hover:border-servora-core hover:text-servora-core hover:scale-[1.02]"
              >
                Explore the Platform
              </Link>
            </div>

            {/* Capability Bar */}
            <div className="mt-10 pt-6 border-t border-gray-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl text-left">
              <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-gray-100 shadow-2xs">
                <span className="text-[10px] font-bold text-servora-teal uppercase tracking-wider">Safaricom Daraja</span>
                <span className="text-base sm:text-lg font-extrabold text-servora-navy font-mono">100% Native</span>
                <span className="text-[10px] text-servora-deepTeal">Instant STK Push &amp; C2B Matching</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-gray-100 shadow-2xs">
                <span className="text-[10px] font-bold text-servora-teal uppercase tracking-wider">Offline Resilience</span>
                <span className="text-base sm:text-lg font-extrabold text-servora-navy font-mono">Zero Downtime</span>
                <span className="text-[10px] text-servora-deepTeal">Local SQLite &amp; Auto Cloud Sync</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-servora-teal uppercase tracking-wider">Recipe Control</span>
                <span className="text-base sm:text-lg font-extrabold text-servora-navy font-mono">Gram-Level</span>
                <span className="text-[10px] text-servora-deepTeal">Automated BOM Stock Deduction</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-servora-teal uppercase tracking-wider">Local Support</span>
                <span className="text-base sm:text-lg font-extrabold text-servora-navy font-mono">Kilimani, Nairobi</span>
                <span className="text-[10px] text-servora-deepTeal">On-Site Hardware Setup &amp; Training</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- WHAT IS SERVORA (GEO ENTITY DEFINITION BLOCK) --- */}
        <section className="py-20 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-servora-pale to-white border border-servora-core/20 p-8 sm:p-12 shadow-sm">
            <span className="text-xs font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3 py-1 rounded-full">
              Enterprise Authority
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
              What Is Servora?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-servora-deepTeal leading-relaxed">
              {SITE_CONFIG.canonicalBrandDefinition} Built for modern hospitality enterprises in Kenya, East Africa, and international markets, Servora eliminates disconnected tills, manual stock sheets, and delayed end-of-day reconciliations.
            </p>
          </div>
        </section>

        {/* --- PLATFORM OVERVIEW (BENTO GRID) --- */}
        <section className="py-20 w-full bg-servora-pale px-4 sm:px-8 lg:px-16 border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Everything Your Hospitality Business Needs
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                One Connected Platform for Complete Control
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
              <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm transition-all hover:border-servora-core hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold text-base mb-6 group-hover:bg-servora-core group-hover:text-white transition-colors">
                  01
                </div>
                <h3 className="text-lg font-bold text-servora-navy mb-3">
                  Point of Sale &amp; Sales Management
                </h3>
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  High-speed checkout supporting Dine-In, Takeaway, Delivery, and Bar Tabs. Process cash, card, split tenders, and instant Safaricom M-Pesa STK Push payments.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm transition-all hover:border-servora-core hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold text-base mb-6 group-hover:bg-servora-core group-hover:text-white transition-colors">
                  02
                </div>
                <h3 className="text-lg font-bold text-servora-navy mb-3">
                  Kitchen Display System &amp; Orders
                </h3>
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Route order items automatically to Grill, Bar, Cold Pantry, or Expediter screens. Monitor live prep timers, SLA breach alerts, and complete staff execution history.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm transition-all hover:border-servora-core hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold text-base mb-6 group-hover:bg-servora-core group-hover:text-white transition-colors">
                  03
                </div>
                <h3 className="text-lg font-bold text-servora-navy mb-3">
                  Inventory &amp; Recipe Management
                </h3>
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Automate ingredient deduction via recipe BOMs, track batch expiry and waste logs, manage suppliers, and streamline purchase orders and goods received notes (GRNs).
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm transition-all hover:border-servora-core hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold text-base mb-6 group-hover:bg-servora-core group-hover:text-white transition-colors">
                  04
                </div>
                <h3 className="text-lg font-bold text-servora-navy mb-3">
                  Table Reservations &amp; Guest Management
                </h3>
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Manage dining areas, live table occupancy, guest reservations, waitlists, customer profiles, and targeted SMS/email retention campaigns.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm transition-all hover:border-servora-core hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold text-base mb-6 group-hover:bg-servora-core group-hover:text-white transition-colors">
                  05
                </div>
                <h3 className="text-lg font-bold text-servora-navy mb-3">
                  Staff &amp; Shift Management
                </h3>
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Control role-based access permissions (RBAC), employee shift rosters, clock-in attendance, cashier till assignments, discount limits, and manager shift handovers.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm transition-all hover:border-servora-core hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold text-base mb-6 group-hover:bg-servora-core group-hover:text-white transition-colors">
                  06
                </div>
                <h3 className="text-lg font-bold text-servora-navy mb-3">
                  Business Intelligence &amp; Analytics
                </h3>
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Make data-driven decisions with executive revenue dashboards, food cost variance reports, menu engineering profitability matrices, and multi-branch comparisons.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-servora-navy text-white text-xs font-bold hover:bg-servora-core transition-all shadow-md"
              >
                <span>Inspect All Hospitality &amp; Restaurant Modules</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* --- INDUSTRY-SPECIFIC SOLUTIONS --- */}
        <section className="py-24 w-full bg-white px-4 sm:px-8 lg:px-16 border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-servora-teal font-bold uppercase tracking-widest text-xs">
                Built for Every Hospitality Business
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-servora-navy mt-2 tracking-tight">
                Tailored Industry Verticals Across Kenya &amp; Beyond
              </h2>
              <p className="text-sm sm:text-base text-servora-deepTeal mt-4">
                Whether you manage a bustling Kilimani café, a hotel F&amp;B group, a high-volume lounge, or a cloud kitchen, Servora adapts seamlessly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-servora-pale p-8 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Restaurants &amp; Cafés
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Full table service, visual floor layouts, split guest checks, modifier groups, reservations, and instant kitchen ticket dispatch.
                  </p>
                </div>
                <Link href="/solutions/restaurants" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Restaurant Solutions &rarr;
                </Link>
              </div>

              <div className="bg-servora-pale p-8 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Hotels &amp; Resorts
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Centralized multi-outlet food and beverage POS, central store stock transfers, banquet billing, and branch-level financial reporting.
                  </p>
                </div>
                <Link href="/solutions/hotels" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Hotel F&amp;B &rarr;
                </Link>
              </div>

              <div className="bg-servora-pale p-8 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Bars &amp; Lounges
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Fast bar-tab management, blind cashier shift reconciliation, pour-cost recipe tracking, and strict stock variance audits.
                  </p>
                </div>
                <Link href="/solutions/bars-lounges" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Bars &amp; Lounges &rarr;
                </Link>
              </div>

              <div className="bg-servora-pale p-8 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <h3 className="text-xl font-bold text-servora-navy mb-3">
                    Cloud Kitchens
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Express counter ordering, takeaway and delivery dispatch tracking, dedicated prep station KDS screens, and automated recipe stock depletion.
                  </p>
                </div>
                <Link href="/solutions/cloud-kitchens" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Cloud Kitchens &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- CONNECTED HOSPITALITY OPERATIONS WORKFLOW --- */}
        <section className="py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Seamless Operational Architecture
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                How Servora Connects Every Transaction
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-servora-core">STEP 01</span>
                <h3 className="text-base font-bold text-servora-navy">Customer Order &amp; POS</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Waiter or customer places an order via touchscreen POS, QR code, or room tab.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-servora-core">STEP 02</span>
                <h3 className="text-base font-bold text-servora-navy">Kitchen Display &amp; Routing</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Items route instantly to station KDS screens with live cook timers and SLA alerts.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col gap-3 border-l-4 border-l-servora-core">
                <span className="text-xs font-mono font-bold text-servora-core">STEP 03</span>
                <h3 className="text-base font-bold text-servora-navy">Recipe BOM Stock Deduction</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Exact ingredient quantities are automatically deducted from stock based on active recipes.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-servora-core">STEP 04</span>
                <h3 className="text-base font-bold text-servora-navy">Payment &amp; Analytics</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  M-Pesa reconciliation updates the cashier ledger and feeds real-time BI dashboards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- BUILT FOR KENYA AND EAST AFRICA --- */}
        <section className="py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 flex flex-col gap-6">
              <span className="text-servora-teal font-bold uppercase tracking-widest text-xs">
                Localized Infrastructure &bull; Built for Kenya &amp; East Africa
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-servora-navy leading-tight tracking-tight">
                Hospitality Technology Designed for the African Market
              </h2>
              <p className="text-sm sm:text-base text-servora-deepTeal leading-relaxed">
                Servora integrates natively with the Safaricom Daraja API for instant STK Push payment verification and C2B till matching, eliminating unverified mobile money slips and accelerating peak-hour checkout. Paired with our enterprise hardware procurement in Kilimani, Nairobi, you get a turnkey solution.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-bold text-servora-navy">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-servora-pale border border-gray-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Safaricom M-Pesa Daraja API Integration</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-servora-pale border border-gray-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Kenyan Shilling (KES) Currency Support</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-servora-pale border border-gray-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>KRA eTIMS Fiscal Invoicing Readiness</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-servora-pale border border-gray-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Local Onboarding &amp; Technical Support</span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/hospitality-software-kenya"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-servora-navy px-8 text-xs font-bold text-white shadow-md transition-all hover:bg-servora-core"
                >
                  Explore Kenya &amp; East Africa Hub &rarr;
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full rounded-3xl bg-servora-pale p-8 sm:p-10 border border-gray-200/80 shadow-xl flex flex-col justify-center gap-6">
              <div className="border-b border-gray-200 pb-4">
                <span className="text-[11px] font-bold text-servora-core uppercase tracking-wider">Developed by Mavora Technologies Ltd[cite: 3]</span>
                <h3 className="text-xl font-bold text-servora-navy mt-1">Local Engineering &amp; Hospitality Support</h3>
              </div>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Work directly with our Nairobi engineering and onboarding team to configure your menus, recipes, kitchen prep stations, tax rules, and branch terminals.
              </p>
              <div className="p-5 rounded-2xl bg-white border border-gray-200 flex flex-col gap-2">
                <span className="text-xs font-bold text-servora-navy">Mavora Technologies Ltd — Nairobi Office</span>
                <span className="text-xs text-servora-deepTeal font-mono">Concert House, Wood Avenue, Kilimani - Nairobi, Kenya</span>
                <a href={`tel:${SITE_CONFIG.parentCompany.telephone}`} className="text-xs font-bold text-servora-core hover:underline">
                  {SITE_CONFIG.parentCompany.displayPhone}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* --- FREQUENTLY ASKED QUESTIONS --- */}
        <section className="py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Answers &amp; Capabilities
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                Frequently Asked Questions About Servora
              </h2>
            </div>

            {/* Expandable Accordion Client Component */}
            <FaqAccordionClient faqs={HOMEPAGE_FAQS} />
          </div>
        </section>

        {/* --- FINAL CONVERSION CTA --- */}
        <section className="py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            {/* Ambient background glow */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />
            
            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-6 ring-1 ring-inset ring-servora-teal/30">
              Ready to Transform Your Operations?
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Ready to Transform Your Hospitality Operations?
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-10 leading-relaxed font-normal">
              Discover how Servora can simplify your restaurant and hotel operations through connected technology, intelligent inventory management, and real-time business insights.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-2xl bg-white px-9 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale hover:scale-105"
              >
                Book a Live Demo &rarr;
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-9 text-sm font-bold text-white transition-all hover:bg-white/20 hover:scale-105 backdrop-blur-xs"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}