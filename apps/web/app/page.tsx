// apps/web/app/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hotel & Restaurant Management System | Servora Kenya',
  description:
    'Manage hotel and restaurant operations with Servora. Streamline reservations, POS sales, orders, inventory, payments and business reporting from one integrated platform.',
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
      'Servora is a hotel, restaurant and hospitality management platform developed by Mavora Technologies Ltd in Nairobi, Kenya. It helps hospitality businesses streamline daily operations through integrated management of POS sales, orders, table reservations, kitchen display routing, inventory, procurement, M-Pesa payments, staff shifts, and executive reporting.',
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
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 w-full px-4 sm:px-8 lg:px-16">
          <div
            aria-hidden="true"
            className="absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80 w-full"
          >
            <div
              className="aspect-[1155/678] w-full max-w-7xl mx-auto bg-gradient-to-tr from-[#0554F4] to-[#0C88FB] opacity-15"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>

          <div className="w-full flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-x-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-servora-navy shadow-sm ring-1 ring-inset ring-servora-core/15 mb-6">
              <span className="inline-block h-2 w-2 rounded-full bg-servora-teal animate-pulse" />
              <span className="text-servora-teal font-bold uppercase tracking-wider text-[10px]">
                Servora &bull; Simplify Service. Grow Smarter.
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-servora-deepTeal">By Mavora Technologies Ltd</span>
            </div>

            <h1 className="w-full max-w-5xl text-3xl font-extrabold tracking-tight text-servora-navy sm:text-5xl lg:text-6xl leading-[1.15]">
              Hotel &amp; Restaurant Management Software for{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Smarter Hospitality Operations
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Servora is an integrated hotel and restaurant management platform designed to simplify hospitality operations. Manage table reservations, guest dining services, POS sales, kitchen orders, inventory, procurement, M-Pesa payments, staff shifts, and business performance through one connected system.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md shadow-servora-core/20 transition-all hover:bg-blue-700 hover:shadow-lg"
              >
                Request a Live Demo
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core hover:text-servora-core"
              >
                Explore Platform Features
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200/60 grid grid-cols-2 gap-4 sm:grid-cols-4 w-full max-w-5xl text-left text-xs text-servora-deepTeal font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Safaricom M-Pesa Daraja Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Multi-Branch &amp; Outlet Isolation</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Offline-Resilient POS Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Real-Time Recipe &amp; BOM Costing</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- SYSTEM PREVIEW CARD --- */}
        <section
          aria-label="Servora Live Operations Console Preview"
          className="pb-16 sm:pb-24 w-full px-4 sm:px-8 lg:px-16"
        >
          <div className="w-full rounded-2xl bg-servora-navy p-4 sm:p-8 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-gray-400">
                  servora.mavoratechnologies.com / pos-checkout
                </span>
              </div>
              <span className="inline-flex items-center rounded-md bg-servora-teal/20 px-2.5 py-1 text-[10px] font-medium text-servora-teal ring-1 ring-inset ring-servora-teal/30">
                Unified Hospitality Cloud
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
              <div className="rounded-xl bg-white/5 p-5 border border-white/10">
                <p className="text-xs text-gray-400">Multi-Tender POS &amp; M-Pesa</p>
                <p className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Instant STK &amp; Till Sync
                </p>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Automated KRA eTIMS fiscal invoice &amp; shift ledger
                </span>
              </div>
              <div className="rounded-xl bg-white/5 p-5 border border-white/10">
                <p className="text-xs text-gray-400">Kitchen Display System (KDS)</p>
                <p className="text-xl sm:text-2xl font-bold text-servora-bright mt-1">
                  Station-Level Routing
                </p>
                <span className="text-[11px] text-servora-teal font-medium">
                  Real-time cook timers, SLA alerts &amp; staff audit trail
                </span>
              </div>
              <div className="rounded-xl bg-white/5 p-5 border border-white/10">
                <p className="text-xs text-gray-400">Inventory &amp; Procurement</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
                  Gram-Level BOM Control
                </p>
                <span className="text-[11px] text-amber-300 font-medium">
                  Batch expiry, supplier POs, GRNs &amp; waste tracking
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* --- WHAT IS SERVORA (GEO ENTITY DEFINITION BLOCK) --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-5xl mx-auto rounded-2xl bg-servora-pale border border-servora-core/15 p-6 sm:p-10">
            <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
              Platform Overview
            </span>
            <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
              What Is Servora?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-servora-deepTeal leading-relaxed">
              {SITE_CONFIG.canonicalBrandDefinition} Built for modern hospitality enterprises in Kenya, East Africa, and international markets, Servora eliminates disconnected tills, manual stock sheets, and delayed end-of-day reconciliations.
            </p>
          </div>
        </section>

        {/* --- CORE INTEGRATED OPERATIONS CAPABILITIES --- */}
        <section className="py-16 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="w-full mb-12 text-center">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Integrated Hospitality Operations
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Connected Point of Sale, Kitchen, Inventory, Workforce &amp; BI
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-2">
                  Point of Sale &amp; M-Pesa Payments
                </h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  High-speed checkout supporting Dine-In, Takeaway, Delivery, and Bar Tabs. Process cash, card, split tenders, and instant Safaricom M-Pesa STK Push payments with automated cashier drawer custody.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-2">
                  Kitchen Display System (KDS) &amp; Orders
                </h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Route order items automatically to Grill, Bar, Cold Pantry, or Expediter screens. Monitor live prep timers, SLA breach alerts, station bump velocity, and complete staff execution history.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-2">
                  Inventory, Recipes &amp; Procurement
                </h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Automate ingredient deduction via recipe BOMs, track batch expiry and waste logs, manage suppliers, and streamline purchase requests, purchase orders, and goods received notes (GRNs).
                </p>
              </div>

              <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">
                  04
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-2">
                  Dining Floor, Reservations &amp; CRM
                </h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Manage dining areas, live table occupancy, guest reservations, waitlists, customer profiles, tiered loyalty rewards, and targeted SMS/email retention campaigns.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">
                  05
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-2">
                  Staff &amp; Shift Custody Management
                </h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Control role-based access permissions (RBAC), employee shift rosters, clock-in attendance, cashier till assignments, discount limits, and manager shift handovers.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">
                  06
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-2">
                  Reporting &amp; Business Intelligence
                </h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Make data-driven decisions with executive revenue dashboards, food cost variance reports, menu engineering profitability matrices, tax summaries, and multi-branch comparisons.
                </p>
              </div>
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/features"
                className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
              >
                Inspect All Hospitality &amp; Restaurant Modules &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* --- SOLUTIONS & VERTICALS HIGHLIGHT --- */}
        <section className="py-20 w-full bg-servora-pale px-4 sm:px-8 lg:px-16 border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-servora-teal font-bold uppercase tracking-widest text-xs">
                Who Servora Is Designed For
              </span>
              <h2 className="text-3xl font-extrabold text-servora-navy mt-2 sm:text-4xl">
                Hotel F&amp;B and Restaurant Management Solutions
              </h2>
              <p className="text-sm text-servora-deepTeal mt-3">
                Whether you operate a single café, a multi-branch restaurant chain, a high-volume bar, or a hotel restaurant and lounge, Servora scales with your operational footprint.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Restaurants &amp; Cafés
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Full table service, visual floor layouts, split guest checks, modifier groups, reservations, and instant kitchen ticket dispatch.
                  </p>
                </div>
                <Link
                  href="/solutions/restaurants"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Explore Restaurant Management Software &rarr;
                </Link>
              </div>

              <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Hotel Restaurants &amp; Hospitality Groups
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Centralized multi-outlet food and beverage POS, central store stock transfers, banquet and lounge billing, and branch-level financial reporting.
                  </p>
                </div>
                <Link
                  href="/features"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Explore Multi-Branch Operations &rarr;
                </Link>
              </div>

              <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Bars &amp; Lounges
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Fast bar-tab management, blind cashier shift reconciliation, safe-drop alerts, pour-cost recipe tracking, and strict stock variance audits.
                  </p>
                </div>
                <Link
                  href="/solutions/bars-lounges"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Explore Bar &amp; Lounge POS &rarr;
                </Link>
              </div>

              <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Cloud Kitchens &amp; Quick Service
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    Express counter ordering, takeaway and delivery dispatch tracking, dedicated prep station KDS screens, and automated recipe stock depletion.
                  </p>
                </div>
                <Link
                  href="/solutions/cloud-kitchens"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                >
                  Explore Cloud Kitchen Software &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- KENYAN PAYMENT & HARDWARE SPOTLIGHT --- */}
        <section className="py-20 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 flex flex-col gap-6">
              <span className="text-servora-teal font-bold uppercase tracking-widest text-xs">
                Why Choose Servora &bull; Built for Kenya &amp; East Africa
              </span>
              <h2 className="text-3xl font-extrabold text-servora-navy sm:text-4xl leading-tight">
                Engineered for Safaricom M-Pesa, KRA eTIMS &amp; Enterprise POS Hardware
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Servora integrates natively with the Safaricom Daraja API for instant STK Push payment verification and C2B till matching, eliminating unverified mobile money slips and accelerating peak-hour checkout. Paired with our POS hardware consultation in Nairobi, hospitality operators get a dependable end-to-end deployment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-semibold text-servora-navy">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Instant M-Pesa STK Push &amp; Till Callback</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Thermal Receipt Printer &amp; Drawer Sync</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Offline Survivability &amp; Conflict Sync</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>16% VAT, 2% Catering Levy &amp; eTIMS Ready</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <Link
                  href="/hardware-pos"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-navy px-7 text-xs font-bold text-white shadow-md transition-all hover:bg-servora-core"
                >
                  Explore POS Hardware &amp; Terminals
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-xs font-bold text-servora-navy transition-all hover:border-servora-core hover:text-servora-core"
                >
                  View Software Plans
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full rounded-2xl bg-servora-pale p-8 border border-gray-200/80 shadow-lg flex flex-col justify-center gap-6">
              <div className="border-b border-gray-200 pb-4">
                <span className="text-[10px] font-bold text-servora-core uppercase tracking-wider">
                  Developed by Mavora Technologies Ltd
                </span>
                <h3 className="text-xl font-bold text-servora-navy mt-1">
                  Local Engineering &amp; Hospitality Support
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Work directly with our Nairobi engineering and onboarding team to configure your menus, recipes, kitchen prep stations, tax rules, and branch terminals.
              </p>
              <div className="p-4 rounded-xl bg-white border border-gray-200 flex flex-col gap-2">
                <span className="text-xs font-bold text-servora-navy">
                  Mavora Technologies Ltd — Nairobi Office
                </span>
                <span className="text-xs text-servora-deepTeal font-mono">
                  Concert House, Wood Avenue, Kilimani - Nairobi, Kenya
                </span>
                <a
                  href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  {SITE_CONFIG.parentCompany.displayPhone}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* --- FREQUENTLY ASKED QUESTIONS (AEO / GEO STRUCTURED ANSWERS) --- */}
        <section className="py-20 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Answers &amp; Capabilities
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-servora-navy">
                Frequently Asked Questions About Servora
              </h2>
            </div>

            <div className="space-y-4">
              {HOMEPAGE_FAQS.map((faq) => (
                <article
                  key={faq.question}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs"
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

        {/* --- FINAL CONVERSION CTA --- */}
        <section className="py-20 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-servora-navy p-8 sm:p-14 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-core/20 blur-3xl pointer-events-none" />
            <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-xs font-bold text-servora-teal uppercase tracking-wider mb-4">
              Get Started with Servora
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Simplify Your Hotel &amp; Restaurant Operations Today
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mb-8 leading-relaxed">
              Experience dependable checkout, instant M-Pesa reconciliation, kitchen station routing, and precise recipe inventory control built by Mavora Technologies.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-8 text-sm font-bold text-white shadow-lg shadow-servora-core/30 transition-all hover:bg-blue-600"
              >
                Book a Consultation &amp; Demo
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20"
              >
                Compare Pricing Plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}