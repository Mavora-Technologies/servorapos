// apps/web/app/features/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import FeatureExplorer from '@/components/features/FeatureExplorer';
import HeroBackgroundVideo from '@/components/landing/HeroBackgroundVideo';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hospitality & Restaurant Management Features | POS, KDS, Inventory & M-Pesa',
  description:
    'Explore Servora features by Mavora Technologies: cloud restaurant POS, Kitchen Display System (KDS), recipe BOM costing, supplier procurement, M-Pesa Daraja payments, staff shifts, and multi-branch reporting.',
  path: '/features',
  keywords: [
    'Hospitality Management Software',
    'Restaurant Management System',
    'Restaurant POS System Kenya',
    'Hotel Restaurant POS',
    'Kitchen Display System KDS',
    'Restaurant Inventory Management',
    'Recipe Costing Software',
    'Restaurant Procurement Software',
    'M-Pesa Integrated POS System',
    'Multi-Branch Restaurant Management',
    'Cloud Kitchen Management Software',
    'Hospitality Business Analytics',
  ],
});

const CAPABILITY_OVERVIEW = [
  { title: 'Point of Sale', detail: 'Dine-In, Takeaway, Delivery & Bar Tabs' },
  { title: 'Kitchen Display System', detail: 'Multi-station routing & SLA timers' },
  { title: 'Recipe & Inventory', detail: 'BOM costing & auto stock deduction' },
  { title: 'Procurement & Suppliers', detail: 'POs, GRNs & inter-branch transfers' },
  { title: 'M-Pesa & Payments', detail: 'Daraja STK Push & C2B reconciliation' },
  { title: 'Workforce Management', detail: 'RBAC, shift rosters & attendance' },
  { title: 'Cash Management', detail: 'Blind till counts & shift handovers' },
  { title: 'Business Intelligence', detail: 'Revenue & menu profitability reports' },
];

const WORKFLOW_STEPS = [
  { step: '01', title: 'Customer Order', detail: 'Order captured at table, counter, or bar tab.' },
  { step: '02', title: 'POS Register', detail: 'Modifiers, promos, and tax rules applied.' },
  { step: '03', title: 'Kitchen Display', detail: 'Items routed to Grill, Bar, Pantry, or Expediter.' },
  { step: '04', title: 'Recipe Deduction', detail: 'BOM calculates exact ingredient usage & wastage.' },
  { step: '05', title: 'Inventory Update', detail: 'Stock balances updated with immutable ledger entry.' },
  { step: '06', title: 'Payment Match', detail: 'M-Pesa STK/C2B, card, or cash recorded to shift.' },
  { step: '07', title: 'BI Analytics', detail: 'Revenue, food cost, and branch reports refreshed.' },
];

const HOSPITALITY_APPLICATIONS = [
  {
    name: 'Hotels & Hotel Restaurants',
    badge: 'Multi-Outlet F&B',
    description: 'Coordinate dining rooms, bars, and central stockrooms across hotel food-and-beverage outlets.',
    href: '/solutions/hotels',
  },
  {
    name: 'Restaurants',
    badge: 'Table Service',
    description: 'Manage full table service, modifiers, split checks, and synchronized kitchen firing.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Cafés & Coffee Shops',
    badge: 'Counter Speed',
    description: 'Accelerate peak counter queues with combo bundles, barista routing, and ingredient tracking.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Bars & Lounges',
    badge: 'Tabs & Pour Cost',
    description: 'Control open bar tabs, pour-cost recipes, blind till reconciliations, and stock audits.',
    href: '/solutions/bars-lounges',
  },
  {
    name: 'Fast-Food Outlets',
    badge: 'Quick Service',
    description: 'Drive high-throughput counter ordering with instant kitchen assembly screens and SLA timers.',
    href: '/solutions/cloud-kitchens',
  },
  {
    name: 'Bakeries & Grill Houses',
    badge: 'Batch & Portioning',
    description: 'Standardize portion yields and raw ingredient consumption with BOM recipe costing.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Cloud Kitchens',
    badge: 'Delivery Dispatch',
    description: 'Run multi-station kitchen displays with automated packaging and ingredient depletion.',
    href: '/solutions/cloud-kitchens',
  },
  {
    name: 'Multi-Branch Groups',
    badge: 'Central Control',
    description: 'Unify supplier procurement, inter-branch stock transfers, and consolidated outlet reporting.',
    href: '/contact',
  },
];

const PLATFORM_VALUE_ITEMS = [
  {
    area: 'Sales & Orders Connected',
    disconnected: 'Manual order pads, re-keyed bills, and delayed modifiers.',
    connected: 'Touch POS captures Dine-In, Takeaway, Delivery, and Bar Tabs in one ledger.',
  },
  {
    area: 'Kitchen Operations Connected',
    disconnected: 'Lost paper dockets and unclear prep priorities across stations.',
    connected: 'Multi-station KDS routing with SLA timers, failover, and bump audit trails.',
  },
  {
    area: 'Recipes Connected to Inventory',
    disconnected: 'End-of-month stock surprises and manual spreadsheet deductions.',
    connected: 'Every POS sale automatically deducts BOM ingredients with unit conversions.',
  },
  {
    area: 'Procurement Connected to Suppliers',
    disconnected: 'Unverified deliveries and scattered vendor invoices.',
    connected: 'Structured PR, PO, GRN accepted/rejected checks, invoices, and branch transfers.',
  },
  {
    area: 'Payments Connected to Transactions',
    disconnected: 'Cashiers manually checking M-Pesa phones during rush hour.',
    connected: 'Native M-Pesa Daraja STK Push and automated C2B Till callback matching.',
  },
  {
    area: 'Workforce Connected to Accountability',
    disconnected: 'Shared logins, unlogged voids, and untracked drawer variances.',
    connected: 'Granular RBAC, shift rosters, clock-ins, and blind till shift handovers.',
  },
  {
    area: 'Operations Connected to Analytics',
    disconnected: 'Delayed financial summaries compiled days after service.',
    connected: 'Live executive revenue, food cost variance, and menu profitability reporting.',
  },
];

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
  {
    question: 'How does Servora handle internet interruptions at the POS?',
    answer:
      'Servora combines local SQLite terminal queueing with cloud synchronization so terminals can continue capturing supported local POS transactions during temporary connectivity drops and sync records back to the cloud once connection is restored.',
  },
  {
    question: 'Does Servora support Safaricom M-Pesa and Kenyan tax configurations?',
    answer:
      'Yes. Servora integrates with Safaricom M-Pesa Daraja for STK Push requests and C2B Till/Paybill callback reconciliation, alongside KES billing, configurable 16% VAT and 2% Catering Levy, and KRA eTIMS invoicing support.',
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
        {/* --- SECTION 1: PREMIUM FEATURES HERO --- */}
        <section className="relative isolate overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 w-full px-4 sm:px-8 lg:px-16">
          {/* Muted Looping Background Video (DxYJMFoz7qU) */}
          <HeroBackgroundVideo
            videoId="DxYJMFoz7qU"
            title="Meet Servora POS – Hospitality Features Background Video"
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
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

              <div className="inline-flex items-center gap-x-2 rounded-full bg-white/95 backdrop-blur-xs px-3.5 py-1.5 text-[11px] font-bold text-servora-navy shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-servora-teal opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-servora-teal" />
                </span>
                <span className="text-servora-teal uppercase tracking-wider text-[10px]">
                  Unified Hospitality Management Platform
                </span>
              </div>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Everything You Need to Run a{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Smarter Hospitality Business.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-servora-deepTeal font-medium">
                From front-of-house sales and kitchen operations to ingredient inventory, procurement, payments, workforce management, and business intelligence, Servora connects your hospitality operations through one integrated platform.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Request a Live Demo &rarr;
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white/95 backdrop-blur-xs px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Explore Pricing
                </Link>
              </div>

              {/* Feature Indicators */}
              <div className="mt-6 pt-5 border-t border-gray-200/80 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-servora-navy">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-servora-core" />
                  POS
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  KDS
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-servora-bright" />
                  Inventory &amp; BOM
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  M-Pesa Payments
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-servora-navy" />
                  Analytics
                </span>
              </div>
            </div>

            {/* Right Column: Illustrative Unified Platform Composition */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-3xl bg-servora-navy/95 backdrop-blur-md p-5 sm:p-6 text-white shadow-2xl ring-1 ring-white/15">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-[11px] font-mono text-gray-300">
                      servora / connected-suite
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-servora-teal uppercase">
                    8 Core Modules
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">POS &amp; KDS</p>
                    <p className="text-sm font-bold text-white mt-1">Synced Orders</p>
                    <p className="text-[11px] text-servora-teal mt-0.5">Grill, Bar &amp; Pantry</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Recipe BOM</p>
                    <p className="text-sm font-bold text-white mt-1">Auto-Deduction</p>
                    <p className="text-[11px] text-emerald-400 mt-0.5">Gram-level ledger</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">M-Pesa Daraja</p>
                    <p className="text-sm font-bold text-white mt-1">STK &amp; C2B Match</p>
                    <p className="text-[11px] text-servora-bright mt-0.5">eTIMS &amp; VAT ready</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Servora AI</p>
                    <p className="text-sm font-bold text-white mt-1">Copilot &amp; Forecast</p>
                    <p className="text-[11px] text-amber-300 mt-0.5">Smart replenishment</p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-300 leading-relaxed border-t border-white/10 pt-3">
                  {SITE_CONFIG.canonicalBrandDefinition}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: PLATFORM CAPABILITY OVERVIEW --- */}
        <section
          aria-label="Platform Capability Overview"
          className="py-8 w-full bg-white border-y border-gray-200/70 px-4 sm:px-8 lg:px-16"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CAPABILITY_OVERVIEW.map((item) => (
              <div
                key={item.title}
                className="p-3 rounded-xl bg-servora-pale/70 border border-gray-100 flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-servora-navy leading-snug">
                  {item.title}
                </span>
                <span className="text-[10px] text-servora-deepTeal mt-1 leading-snug">
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* --- SECTION 3: CORE PLATFORM MODULES (ASYMMETRICAL BENTO GRID) --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16 bg-servora-pale">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Core Platform Modules
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Six Integrated Modules Built for Hospitality Reality
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
              {/* A. Point of Sale (7 cols) */}
              <article className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-white p-7 sm:p-8 border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold">
                      01 &bull; POINT OF SALE (POS)
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Offline-Resilient Checkout
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-servora-navy mb-2">
                    High-Speed Point of Sale (POS)
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-5">
                    Touch-optimized order entry supporting Dine-In, Takeaway, Delivery, and Bar Tabs. Configure custom modifiers, combo bundles, promotional codes, and split tenders from one register.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy mb-6">
                    {['Dine-In', 'Takeaway', 'Delivery', 'Bar Tabs', 'Custom Modifiers', 'Combo Bundles', 'Promo Codes', 'Split Tenders'].map((tag) => (
                      <span key={tag} className="bg-servora-pale px-2.5 py-1 rounded-md border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/solutions/restaurants"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1 pt-4 border-t border-gray-100"
                >
                  Restaurant POS Workflows &rarr;
                </Link>
              </article>

              {/* B. Kitchen Display System (5 cols - Navy Contrast) */}
              <article className="lg:col-span-5 flex flex-col justify-between rounded-3xl bg-servora-navy text-white p-7 sm:p-8 shadow-md">
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-white/10 text-servora-teal font-mono text-xs font-bold mb-4">
                    02 &bull; KITCHEN DISPLAY (KDS)
                  </span>
                  <h3 className="text-xl font-extrabold text-white mb-2">
                    Kitchen Display System &amp; Multi-Station Routing
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-5">
                    Automatically split and route tickets across Grill, Bar, Cold Pantry, Pastry, and Expediter screens with target/warning/critical SLA timers, backup station failover, and staff execution audit trails.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-200 mb-6">
                    {['Grill Station', 'Bar Station', 'Cold Pantry', 'Expediter', 'SLA Timers', 'Station Failover'].map((tag) => (
                      <span key={tag} className="bg-white/10 px-2.5 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/solutions/cloud-kitchens"
                  className="text-xs font-bold text-servora-teal hover:underline inline-flex items-center gap-1 pt-4 border-t border-white/10"
                >
                  Cloud Kitchen &amp; KDS Dispatch &rarr;
                </Link>
              </article>

              {/* C. M-Pesa Daraja & Fiscal Compliance (5 cols) */}
              <article className="lg:col-span-5 flex flex-col justify-between rounded-3xl bg-white p-7 sm:p-8 border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all">
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold mb-4">
                    03 &bull; M-PESA &amp; FISCAL
                  </span>
                  <h3 className="text-xl font-extrabold text-servora-navy mb-2">
                    M-Pesa Daraja &amp; Fiscal Compliance
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-5">
                    Trigger instant M-Pesa STK Push payment requests from the register and reconcile C2B Till and Paybill callbacks automatically, paired with configurable 16% VAT, 2% Catering Levy, and KRA eTIMS invoicing.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy mb-6">
                    {['M-Pesa STK Push', 'C2B Callbacks', 'VAT & Levy Config', 'KRA eTIMS Invoicing'].map((tag) => (
                      <span key={tag} className="bg-servora-pale px-2.5 py-1 rounded-md border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/hardware-pos"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1 pt-4 border-t border-gray-100"
                >
                  POS Terminals &amp; Thermal Printers &rarr;
                </Link>
              </article>

              {/* D. Recipe Costing & Inventory (7 cols - Highlighted Border) */}
              <article className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-white p-7 sm:p-8 border-2 border-servora-core/30 shadow-sm hover:border-servora-core hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold">
                      04 &bull; RECIPE BOM &amp; INVENTORY
                    </span>
                    <span className="text-[11px] font-bold text-servora-core bg-servora-core/10 px-2.5 py-1 rounded-full">
                      Automatic Deduction on Sale
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-servora-navy mb-2">
                    Recipe Costing &amp; Ingredient-Level Inventory Control
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-5">
                    Link every dish to a Bill of Materials (BOM) recipe with unit conversions and wastage percentages for automatic stock deduction on sale. Track batch expiry dates, storage bins, blind cycle counts, waste logs, and theoretical vs. actual food cost.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy mb-6">
                    {['Bill of Materials (BOM)', 'Unit Conversions', 'Wastage %', 'Batch Expiry', 'Storage Bins', 'Blind Cycle Counts', 'Waste Logs', 'Food Cost Variance'].map((tag) => (
                      <span key={tag} className="bg-servora-pale px-2.5 py-1 rounded-md border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/solutions/bars-lounges"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1 pt-4 border-t border-gray-100"
                >
                  Bar Pour-Cost &amp; Stock Control &rarr;
                </Link>
              </article>

              {/* E. Supplier Procurement & Transfers (6 cols) */}
              <article className="lg:col-span-6 flex flex-col justify-between rounded-3xl bg-white p-7 sm:p-8 border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all">
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold mb-4">
                    05 &bull; PROCUREMENT &amp; TRANSFERS
                  </span>
                  <h3 className="text-xl font-extrabold text-servora-navy mb-2">
                    Supplier Procurement &amp; Inter-Branch Transfers
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-5">
                    Manage vendor directories, department purchase requests, Purchase Orders (POs), Goods Received Notes (GRNs) with accepted/rejected quantity checks, supplier invoices, vendor returns, and inter-branch stock transfers.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy mb-6">
                    {['Supplier Directory', 'Purchase Orders', 'GRN QC Checks', 'Supplier Invoices', 'Vendor Returns', 'Branch Transfers'].map((tag) => (
                      <span key={tag} className="bg-servora-pale px-2.5 py-1 rounded-md border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1 pt-4 border-t border-gray-100"
                >
                  Multi-Branch Supply Chain Demo &rarr;
                </Link>
              </article>

              {/* F. Workforce, Cash Custody & BI (6 cols) */}
              <article className="lg:col-span-6 flex flex-col justify-between rounded-3xl bg-white p-7 sm:p-8 border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all">
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold mb-4">
                    06 &bull; WORKFORCE, CASH &amp; BI
                  </span>
                  <h3 className="text-xl font-extrabold text-servora-navy mb-2">
                    Workforce Shifts, Cash Custody &amp; Business Intelligence
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-5">
                    Enforce granular role-based access permissions (RBAC), employee shift schedules, clock-in attendance, blind till reconciliations, manager shift handovers, and executive revenue and menu profitability analytics.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy mb-6">
                    {['Granular RBAC', 'Shift Schedules', 'Clock-In Attendance', 'Blind Till Counts', 'Shift Handovers', 'Menu Profitability'].map((tag) => (
                      <span key={tag} className="bg-servora-pale px-2.5 py-1 rounded-md border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1 pt-4 border-t border-gray-100"
                >
                  Compare Editions &amp; Seat Plans &rarr;
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* --- SECTION 4: INTERACTIVE PRODUCT FEATURE EXPLORER --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Interactive Module Explorer
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Explore the Servora Platform
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Switch between operational domains to inspect how Servora connects front-of-house service, culinary prep, inventory ledgers, and executive analytics.
              </p>
            </div>

            <FeatureExplorer />
          </div>
        </section>

        {/* --- SECTION 5: CONNECTED OPERATIONAL WORKFLOW --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                End-to-End Order Lifecycle
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                How One Order Connects Your Entire Operation
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
              {WORKFLOW_STEPS.map((item, idx) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2 py-0.5 rounded">
                        STEP {item.step}
                      </span>
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <span className="hidden lg:inline text-gray-400 font-mono text-xs">&rarr;</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 6: ADVANCED INVENTORY & RECIPE MANAGEMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 flex flex-col gap-4">
              <span className="inline-flex self-start rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Ingredient-Level Control
              </span>
              <h2 className="text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight leading-tight">
                Every Sale Connected to Every Ingredient.
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Map every menu item to a Bill of Materials (BOM) recipe with defined ingredient quantities, unit conversions (such as grams to kilograms or milliliters to liters), and wastage percentages. The moment a sale completes at the POS, Servora automatically deducts ingredient stock and records an immutable stock movement.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm font-semibold text-servora-navy pt-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  Automatic ingredient deduction on POS order completion
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  Unit conversions &amp; configured wastage allowances
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  Theoretical vs. actual food cost visibility per dish
                </li>
              </ul>
            </div>

            {/* Illustrative BOM Workflow Diagram */}
            <div className="lg:col-span-6 rounded-3xl bg-servora-pale border border-gray-200/90 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-extrabold text-servora-navy uppercase tracking-wider">
                  Recipe BOM Deduction Flow
                </span>
                <span className="text-[10px] font-mono text-servora-deepTeal bg-white px-2.5 py-1 rounded-full border border-gray-200">
                  Illustrative Workflow
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { stage: '1. Menu Item Sold', desc: 'Cashier confirms 1x Grilled Signature Dish on POS.' },
                  { stage: '2. Recipe BOM Lookup', desc: 'System loads linked recipe with unit conversions & wastage %.' },
                  { stage: '3. Ingredient Quantities', desc: 'Calculates exact protein, spice, oil, and garnish usage.' },
                  { stage: '4. Automatic Stock Deduction', desc: 'Depletes active storage bin balances & writes stock movement.' },
                  { stage: '5. Updated Inventory & Cost', desc: 'Updates batch levels, low-stock alerts, and food cost report.' },
                ].map((node) => (
                  <div
                    key={node.stage}
                    className="rounded-xl bg-white border border-gray-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <span className="text-xs font-bold text-servora-core">{node.stage}</span>
                    <span className="text-xs text-servora-deepTeal">{node.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 7: ENTERPRISE ARCHITECTURE --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-servora-navy p-7 sm:p-12 text-white shadow-2xl ring-1 ring-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[10px] font-bold text-servora-teal uppercase tracking-widest">
                  Enterprise Architecture
                </span>
                <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Built for Reliable, Connected Hospitality Operations.
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                  Servora pairs a multi-tenant cloud backend with local SQLite terminal queueing. During temporary internet interruptions, terminals can queue supported local POS operations and synchronize records back to the cloud automatically once connectivity returns—keeping multi-branch outlets aligned without manual re-entry.
                </p>
                <div className="mt-6">
                  <Link
                    href="/contact"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-xs font-bold text-servora-navy shadow-md hover:bg-servora-pale transition-colors"
                  >
                    Speak to Engineering &rarr;
                  </Link>
                </div>
              </div>

              {/* Simplified Architecture Diagram */}
              <div className="lg:col-span-5 grid grid-cols-1 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <span className="text-[10px] font-mono text-servora-teal uppercase">Layer 01 • Local Terminal</span>
                  <h3 className="text-sm font-bold text-white mt-1">POS &amp; Local SQLite Queue</h3>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Fast local order capture and offline queueing during connectivity drops.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <span className="text-[10px] font-mono text-servora-teal uppercase">Layer 02 • Sync Engine</span>
                  <h3 className="text-sm font-bold text-white mt-1">Encrypted Cloud Synchronization</h3>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Reconciles queued orders, stock movements, and payment callbacks automatically.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <span className="text-[10px] font-mono text-servora-teal uppercase">Layer 03 • Multi-Tenant Cloud</span>
                  <h3 className="text-sm font-bold text-white mt-1">Multi-Branch Isolation &amp; BI</h3>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Branch-scoped access control with centralized head-office reporting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 8: HOSPITALITY BUSINESS APPLICATIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hospitality Business Applications
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Adaptable Across Every Hospitality Model
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HOSPITALITY_APPLICATIONS.map((app) => (
                <article
                  key={app.name}
                  className="rounded-3xl bg-servora-pale border border-gray-200/80 overflow-hidden flex flex-col justify-between hover:border-servora-core hover:shadow-md transition-all"
                >
                  <div>
                    <div className="h-24 bg-gradient-to-br from-servora-navy via-[#0a2e73] to-servora-core p-4 flex flex-col justify-between">
                      <span className="inline-flex self-start rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-servora-teal uppercase">
                        {app.badge}
                      </span>
                      <h3 className="text-base font-extrabold text-white leading-snug">
                        {app.name}
                      </h3>
                    </div>
                    <p className="p-5 text-xs text-servora-deepTeal leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                  <div className="px-5 pb-5 pt-2">
                    <Link
                      href={app.href}
                      className="text-xs font-bold text-servora-core hover:underline"
                    >
                      Explore Solution &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 9: KENYA-READY PAYMENTS & OPERATIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-12 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                  Kenya &amp; East Africa Ready
                </span>
                <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                  Built for Kenyan Payments, Tax Rules &amp; POS Hardware
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Servora is engineered by Mavora Technologies Ltd in Kilimani, Nairobi to match the daily payment, tax, and hardware realities of Kenyan hospitality businesses.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/hospitality-software-kenya"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-navy px-6 text-xs font-bold text-white hover:bg-servora-core transition-colors"
                  >
                    Kenya Operations Hub &rarr;
                  </Link>
                  <Link
                    href="/hardware-pos"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-xs font-bold text-servora-navy hover:border-servora-core hover:text-servora-core transition-colors"
                  >
                    POS Hardware &amp; Printers
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-servora-navy">
                {[
                  'Safaricom M-Pesa Daraja Integration',
                  'Instant STK Push Payment Requests',
                  'C2B Till & Paybill Callback Reconciliation',
                  'Kenyan Shilling (KES) Transactions',
                  'Configurable 16% VAT & 2% Catering Levy',
                  'KRA eTIMS Invoicing Support',
                  'Thermal Receipt Printers & Cash Drawers',
                  'Kilimani, Nairobi Onboarding & Support',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/70"
                  >
                    <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 10: PLATFORM VALUE (DISCONNECTED VS CONNECTED) --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Integrated Platform Value
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Why One Connected System Outperforms Fragmented Tools
              </h2>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200/90 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 bg-servora-navy text-white text-xs font-bold uppercase tracking-wider px-6 py-4">
                <div className="md:col-span-4">Operational Area</div>
                <div className="hidden md:block md:col-span-4 text-gray-300">Fragmented Tools</div>
                <div className="hidden md:block md:col-span-4 text-servora-teal">Connected with Servora</div>
              </div>
              <div className="divide-y divide-gray-200/80 bg-white">
                {PLATFORM_VALUE_ITEMS.map((row) => (
                  <div
                    key={row.area}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 text-xs items-center"
                  >
                    <div className="md:col-span-4 font-bold text-servora-navy">{row.area}</div>
                    <div className="md:col-span-4 text-servora-deepTeal">
                      <span className="md:hidden font-bold text-gray-500 mr-1">Fragmented:</span>
                      {row.disconnected}
                    </div>
                    <div className="md:col-span-4 font-semibold text-servora-navy">
                      <span className="md:hidden font-bold text-servora-teal mr-1">Servora:</span>
                      {row.connected}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 11: TECHNICAL FAQ (EXPANDABLE ACCORDION) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Technical Insights
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Technical &amp; Operational Feature Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={FEATURES_FAQS} />
          </div>
        </section>

        {/* --- SECTION 12: FINAL CONVERSION SECTION --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              See How Servora Connects Your Entire Hospitality Business.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Discover how one integrated platform from Mavora Technologies can help your team manage sales, kitchen operations, inventory, procurement, payments, and business performance.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Book a Live Demo &rarr;
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Explore Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}