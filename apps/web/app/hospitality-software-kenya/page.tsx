// apps/web/app/hospitality-software-kenya/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Best Hotel & Restaurant Management Software in Kenya | Servora',
  description:
    'Hospitality management and restaurant POS software built for Kenya and East Africa by Mavora Technologies (Kilimani, Nairobi). Featuring Safaricom M-Pesa Daraja STK Push, configurable Kenyan tax workflows, recipe BOM inventory, and offline-resilient checkout.',
  path: '/hospitality-software-kenya',
  keywords: [
    'Hotel Management System Kenya',
    'Restaurant POS System Nairobi',
    'Best Restaurant Software Kenya',
    'Hospitality Management Software Kenya',
    'M-Pesa Integrated POS System',
    'Restaurant Management Software Nairobi',
    'Hotel Restaurant POS Kenya',
    'Restaurant Inventory Management Kenya',
    'Kitchen Display System Kenya',
    'Restaurant Billing Software Kenya',
    'Multi-Branch Restaurant Management',
    'Hospitality Software East Africa',
    'Servora Mavora Technologies',
  ],
});

const LOCAL_CAPABILITIES = [
  { title: 'M-Pesa Daraja Integration', detail: 'STK Push & C2B Till callbacks' },
  { title: 'KES Currency Support', detail: 'Kenyan Shilling billing & reporting' },
  { title: 'Restaurant POS', detail: 'Dine-In, Takeaway, Delivery & Tabs' },
  { title: 'Kitchen Display (KDS)', detail: 'Multi-station ticket routing' },
  { title: 'Recipe BOM Inventory', detail: 'Automated ingredient deduction' },
  { title: 'Multi-Branch Control', detail: 'Connected multi-outlet visibility' },
  { title: 'Nairobi Support', detail: 'Kilimani onboarding & training' },
];

const KENYA_CHALLENGES = [
  {
    title: 'High-Volume Service & M-Pesa Reconciliation',
    detail:
      'Eliminate peak-hour checkout queues caused by cashiers manually verifying M-Pesa SMS messages on a till phone.',
  },
  {
    title: 'Food & Beverage Cost Control',
    detail:
      'Connect every dish and drink sold to exact ingredient recipes so shrinkage and over-portioning surface early.',
  },
  {
    title: 'Kitchen & Service Coordination',
    detail:
      'Replace lost or smudged paper dockets with digital Kitchen Display routing across Grill, Bar, and Cold Pantry.',
  },
  {
    title: 'Procurement & Supplier Visibility',
    detail:
      'Standardize purchase requisitions, Purchase Orders (POs), and Goods Received Notes (GRNs) across vendors.',
  },
  {
    title: 'Multi-Outlet Oversight',
    detail:
      'Monitor branch sales, stock transfers, and cashier shift handovers without waiting for manual end-of-week spreadsheets.',
  },
  {
    title: 'Connectivity Fluctuations',
    detail:
      'Keep supported POS order capture moving with local SQLite terminal queueing when internet links fluctuate.',
  },
];

const MPESA_WORKFLOW = [
  { step: '01', title: 'Customer Order', detail: 'Waiter or cashier rings up the guest bill.' },
  { step: '02', title: 'POS Checkout', detail: 'Cashier selects M-Pesa tender on the terminal.' },
  { step: '03', title: 'STK Push Request', detail: 'Prompt sent directly to the guest’s mobile phone.' },
  { step: '04', title: 'Customer Payment', detail: 'Guest enters M-Pesa PIN to authorize KES total.' },
  { step: '05', title: 'Daraja Callback', detail: 'M-Pesa confirmation returns to Servora automatically.' },
  { step: '06', title: 'Reconciled Sale', detail: 'Order closes and posts to the cashier shift ledger.' },
];

const BUSINESS_TYPES = [
  {
    name: 'Hotels & Hotel Restaurants',
    badge: 'Hotel F&B',
    description:
      'Manage hotel F&B sales, dining room service, kitchen workflows, central stores, and outlet inventory.',
    href: '/solutions/hotels',
  },
  {
    name: 'Restaurants',
    badge: 'Table Service',
    description:
      'Connect dine-in floor plans, takeaway, delivery, split checks, kitchen stations, and recipe stock.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Cafés & Coffee Shops',
    badge: 'Counter Speed',
    description:
      'Manage menu modifiers, rapid counter transactions, milk and bean ingredients, and daily sales.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Bars & Lounges',
    badge: 'Tabs & Pour Cost',
    description:
      'Support open bar tabs, beverage recipe inventory, blind till counts, and shift custody controls.',
    href: '/solutions/bars-lounges',
  },
  {
    name: 'Fast-Food Outlets',
    badge: 'Quick Service',
    description:
      'Streamline combo ordering, high-speed kitchen routing, and multi-tender counter checkout.',
    href: '/solutions/cloud-kitchens',
  },
  {
    name: 'Bakeries & Grill Houses',
    badge: 'Portion Control',
    description:
      'Track menu production yields, ingredient consumption, wastage percentages, and batch stock.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Cloud Kitchens',
    badge: 'Digital Dispatch',
    description:
      'Coordinate digital orders, multi-station KDS prep screens, and takeaway/delivery dispatch.',
    href: '/solutions/cloud-kitchens',
  },
  {
    name: 'Multi-Branch Groups',
    badge: 'Enterprise Scale',
    description:
      'Improve operational visibility, inter-branch transfers, and financial reporting across outlets.',
    href: '/features',
  },
];

const KENYA_FAQS = [
  {
    question: 'Why is Servora considered a top restaurant POS and hotel management system in Kenya?',
    answer:
      'Servora is engineered specifically for the operational realities of Kenyan hospitality businesses. It provides native Safaricom M-Pesa Daraja integration for instant STK Push and C2B till reconciliation, KES currency support, configurable Kenyan tax calculations including VAT and Catering Levy, KRA eTIMS invoice readiness, and offline-resilient POS checkouts.',
  },
  {
    question: 'Where is Mavora Technologies located in Nairobi?',
    answer:
      'Mavora Technologies Ltd is headquartered at Concert House, Wood Avenue, Kilimani, Nairobi, Kenya. Our local engineering and customer success team provides hands-on onboarding, menu configuration, and hardware setup for restaurants across Nairobi and East Africa.',
  },
  {
    question: 'How does Servora handle M-Pesa payments at the POS?',
    answer:
      'Cashiers can initiate M-Pesa STK Push prompts directly from the POS checkout screen or reconcile incoming C2B Till and Paybill callbacks automatically, linking verified transaction codes directly to each sales record and cashier shift.',
  },
  {
    question: 'Can Servora continue operating if our internet connection drops temporarily?',
    answer:
      'Servora pairs cloud synchronization with local SQLite terminal queueing so supported local POS order capture and checkout operations can continue during temporary connectivity interruptions and sync automatically once the connection is restored.',
  },
  {
    question: 'Does Servora support multi-branch restaurant and hotel groups?',
    answer:
      'Yes. Servora supports multi-branch tenant architecture, allowing hospitality groups to manage separate outlets, branch-level sales and inventory, inter-branch stock transfers, and consolidated operational reporting from one platform.',
  },
];

export default function KenyaSoftwarePage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Hospitality Software Kenya', path: '/hospitality-software-kenya' },
          ]),
          buildFaqSchema(KENYA_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM REGIONAL HERO --- */}
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/60 to-servora-pale">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link href="/" className="hover:text-servora-core font-semibold">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-bold text-servora-navy">Kenya &amp; East Africa</li>
                </ol>
              </nav>

              <div className="inline-flex items-center gap-x-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                <span className="w-2 h-2 rounded-full bg-servora-teal" />
                <span>Built for Hospitality in Kenya &amp; East Africa</span>
              </div>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Smarter Hotel &amp; Restaurant Management{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Starts Here.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Manage restaurant sales, hotel F&amp;B operations, kitchen workflows, ingredient inventory, procurement, M-Pesa payments, and business performance through one integrated hospitality management platform developed by {SITE_CONFIG.parentCompany.name} in Kilimani, Nairobi.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Book a Nairobi Demo &rarr;
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Explore Pricing in KES
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-200/80 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-servora-navy w-full max-w-lg">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  M-Pesa Daraja STK &amp; C2B
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-core" />
                  KES &amp; Configurable Tax
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-bright" />
                  Multi-Branch Cloud Control
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Kilimani, Nairobi Support
                </span>
              </div>
            </div>

            {/* Right Column: Regional Visual Showcase */}
            <div className="lg:col-span-6 w-full">
              <div className="rounded-3xl bg-servora-navy p-2.5 sm:p-3 shadow-2xl ring-1 ring-white/15 overflow-hidden">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/restaurant-pos-kenya.png"
                    alt="Kenyan restaurant POS checkout with Lipa na M-Pesa payment, KRA eTIMS readiness, and offline resilience"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Servora Hospitality Suite &bull; Kenya Edition
                  </span>
                  <span className="font-mono text-servora-teal">
                    POS &bull; KDS &bull; BOM &bull; M-Pesa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: LOCAL MARKET TRUST & CAPABILITY STRIP --- */}
        <section
          aria-label="Verified Local Capabilities"
          className="py-6 w-full bg-white border-y border-gray-200/70 px-4 sm:px-8 lg:px-16"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {LOCAL_CAPABILITIES.map((item) => (
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

        {/* --- SECTION 3: WHY KENYAN HOSPITALITY BUSINESSES NEED INTEGRATED SOFTWARE --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Built for Local Realities
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Designed Around the Realities of Running a Hospitality Business in Kenya.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Disconnected tills, manual M-Pesa verification, and spreadsheet stocktaking slow down service and hide margin leaks. Servora unifies every operational layer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {KENYA_CHALLENGES.map((item, idx) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-white border border-gray-200/80 p-6 shadow-2xs"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold mb-4">
                    0{idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-servora-navy mb-2">{item.title}</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 4: M-PESA DARAJA INTEGRATION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                Safaricom M-Pesa Daraja Integration
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                Connect Restaurant Sales With M-Pesa Payments.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
                Initiate M-Pesa STK Push prompts directly from the POS register and reconcile incoming C2B Till and Paybill callbacks automatically—linking every verified payment straight to its sales record.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
              {MPESA_WORKFLOW.map((item, idx) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2 py-0.5 rounded">
                        STEP {item.step}
                      </span>
                      {idx < MPESA_WORKFLOW.length - 1 && (
                        <span className="hidden lg:inline text-gray-400 font-mono text-xs">&rarr;</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-[11px] text-gray-400">
              M-Pesa is a registered trademark of Safaricom PLC. Servora integrates via the Daraja API and is independently developed by {SITE_CONFIG.parentCompany.name}.
            </p>
          </div>
        </section>

        {/* --- SECTION 5: KENYAN TAX & FISCAL OPERATIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Tax &amp; Fiscal Workflows
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Support for Kenyan Tax and Invoicing Workflows.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Configure applicable Kenyan tax rules per menu category or item—including configurable VAT and Catering Levy rates—so every receipt, shift report, and sales summary reflects your current tax setup.
              </p>
              <p className="mt-3 text-xs text-servora-deepTeal/90 leading-relaxed">
                Tax rates are fully configurable to remain aligned with current applicable Kenyan tax requirements. Servora supports structured tax calculation, sales summary reporting, and KRA eTIMS invoice data readiness depending on your venue’s fiscal device and onboarding setup.
              </p>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Configurable VAT & Levy',
                  desc: 'Assign applicable VAT and Catering Levy rules per menu item or outlet.',
                },
                {
                  title: 'Itemized Sales Summaries',
                  desc: 'Generate clean net, tax, and gross sales breakdowns by shift and period.',
                },
                {
                  title: 'eTIMS Invoice Readiness',
                  desc: 'Prepare structured fiscal invoice records aligned with KRA eTIMS workflows.',
                },
                {
                  title: 'Thermal Receipt Printing',
                  desc: 'Print clear KES receipts with itemized tax lines and cash drawer triggers.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-5"
                >
                  <h3 className="text-sm font-bold text-servora-navy mb-1.5">{card.title}</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 6: COMPLETE HOSPITALITY MANAGEMENT PLATFORM --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Unified Platform Modules
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Everything Your Hospitality Business Needs in One Connected Platform.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { num: '01', title: 'Restaurant POS & Sales', desc: 'Dine-In, Takeaway, Delivery, Bar Tabs & split tenders.', href: '/features' },
                { num: '02', title: 'Kitchen Display (KDS)', desc: 'Grill, Bar, Cold Pantry & Expediter routing with SLAs.', href: '/solutions/cloud-kitchens' },
                { num: '03', title: 'Recipe Costing & Inventory', desc: 'BOM stock deduction, unit conversions & waste logs.', href: '/features' },
                { num: '04', title: 'Supplier Procurement', desc: 'Purchase requests, POs, GRNs & supplier invoices.', href: '/features' },
                { num: '05', title: 'M-Pesa & Payments', desc: 'Daraja STK Push, C2B callbacks & multi-tender tracking.', href: '/hardware-pos' },
                { num: '06', title: 'Workforce & Shifts', desc: 'Granular RBAC, shift rosters & clock-in attendance.', href: '/features' },
                { num: '07', title: 'Cash Management', desc: 'Cashier drawer registers, blind counts & Z-reports.', href: '/features' },
                { num: '08', title: 'Business Intelligence', desc: 'Live revenue, food cost variance & menu profitability.', href: '/pricing' },
              ].map((mod) => (
                <article
                  key={mod.title}
                  className="rounded-2xl bg-white border border-gray-200/80 p-6 flex flex-col justify-between hover:border-servora-core hover:shadow-md transition-all"
                >
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-[11px] font-bold mb-3">
                      {mod.num}
                    </span>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{mod.title}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">{mod.desc}</p>
                  </div>
                  <Link
                    href={mod.href}
                    className="mt-5 pt-3 border-t border-gray-100 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    Learn More &rarr;
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: AUTOMATIC INGREDIENT INVENTORY CONTROL --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Recipe BOM Inventory
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Know What Every Sale Consumes. Control What Every Dish Costs.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Link every menu item to a Bill of Materials (BOM) recipe with ingredient quantities, unit conversions, and wastage percentages. Every completed POS sale automatically deducts ingredient stock and records a stock movement for real-time food cost visibility.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-bold text-servora-navy">
                {[
                  'Menu Item',
                  '→ Recipe BOM',
                  '→ Ingredient Usage',
                  '→ Stock Deduction',
                  '→ Updated Inventory',
                ].map((step) => (
                  <span
                    key={step}
                    className="rounded-lg bg-servora-pale border border-gray-200/80 px-3 py-1.5"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-md bg-servora-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/resources/recipe-bom-food-cost.png"
                  alt="Chef preparing measured ingredients alongside a Recipe BOM screen showing stock deduction and food cost summary in KSh"
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 8: OFFLINE-RESILIENT OPERATIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-servora-navy p-7 sm:p-12 text-white shadow-2xl ring-1 ring-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[10px] font-bold text-servora-teal uppercase tracking-widest">
                  Offline-Resilient Architecture
                </span>
                <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Designed for More Reliable Restaurant Operations.
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                  Servora combines local SQLite terminal queueing with cloud synchronization. When internet connectivity drops temporarily, terminals can queue supported local POS order capture and checkout records locally and synchronize them back to the cloud once connectivity returns.
                </p>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <span className="text-[10px] font-mono text-servora-teal uppercase">
                    Local Terminal Layer
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">Local SQLite Queue</h3>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Keeps supported local POS order entry and receipt printing responsive during brief network interruptions.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <span className="text-[10px] font-mono text-servora-teal uppercase">
                    Cloud Sync Layer
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">Multi-Branch Cloud</h3>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Reconciles queued transactions, updates central stock ledgers, and refreshes executive analytics automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 9: SUPPORT FOR DIFFERENT HOSPITALITY BUSINESSES --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hospitality Verticals
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Tailored for Every Kenyan Hospitality Format
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {BUSINESS_TYPES.map((biz) => (
                <article
                  key={biz.name}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6 flex flex-col justify-between hover:border-servora-core hover:bg-white hover:shadow-md transition-all"
                >
                  <div>
                    <span className="inline-block rounded-full bg-servora-core/10 px-2.5 py-0.5 text-[10px] font-bold text-servora-core uppercase tracking-wider mb-3">
                      {biz.badge}
                    </span>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{biz.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">
                      {biz.description}
                    </p>
                  </div>
                  <Link
                    href={biz.href}
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    Explore Solution &rarr;
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 10: MULTI-BRANCH MANAGEMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-12 shadow-xs">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Multi-Outlet Scale
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                One Platform. Multiple Outlets. Connected Operations.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal">
                Monitor branch-level sales, inventory balances, inter-branch stock transfers, and operational reports from one unified workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
              <div className="rounded-2xl bg-servora-navy text-white p-5 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase text-servora-teal">
                  Central Workspace
                </span>
                <h3 className="text-base font-extrabold mt-2">Head Office</h3>
                <p className="text-[11px] text-gray-300 mt-1">
                  Consolidated BI reporting, procurement oversight, and central store transfers.
                </p>
              </div>
              {['Branch A • Flagship', 'Branch B • Express', 'Branch C • Hotel F&B'].map(
                (branch) => (
                  <div
                    key={branch}
                    className="rounded-2xl bg-servora-pale border border-gray-200/80 p-5 flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-mono uppercase text-servora-core">
                      Connected Outlet
                    </span>
                    <h3 className="text-sm font-extrabold text-servora-navy mt-2">{branch}</h3>
                    <p className="text-[11px] text-servora-deepTeal mt-1">
                      Isolated POS tills, local KDS screens, and real-time cloud inventory sync.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* --- SECTION 11: LOCAL ONBOARDING & SUPPORT --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Kilimani, Nairobi Headquarters
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Local Expertise. Practical Implementation. Ongoing Support.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Servora is developed and supported by {SITE_CONFIG.parentCompany.name} from our Nairobi office. Our engineering and customer success team works alongside your staff to deliver practical onboarding and long-term operational support across Kenya and East Africa.
              </p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-servora-navy">
                {[
                  'Product Demonstrations',
                  'System Onboarding',
                  'Menu & BOM Configuration',
                  'POS Hardware Setup',
                  'Hands-On Staff Training',
                  'Implementation Assistance',
                ].map((service) => (
                  <div
                    key={service}
                    className="rounded-xl bg-servora-pale border border-gray-200/70 p-3 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-servora-teal flex-shrink-0" />
                    <span>{service}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-3xl bg-servora-pale border border-gray-200/90 p-7 sm:p-8 shadow-sm space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-servora-core">
                Visit or Contact Our Nairobi Team
              </span>
              <h3 className="text-xl font-extrabold text-servora-navy">
                {SITE_CONFIG.parentCompany.name}
              </h3>
              <p className="text-xs font-mono text-servora-deepTeal">
                Concert House, Wood Avenue, Kilimani, Nairobi, Kenya
              </p>
              <div className="pt-2 flex flex-col gap-2 text-xs font-bold">
                <a
                  href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                  className="text-servora-core hover:underline"
                >
                  {SITE_CONFIG.parentCompany.displayPhone}
                </a>
                <a
                  href={`mailto:${SITE_CONFIG.parentCompany.email}`}
                  className="text-servora-deepTeal hover:text-servora-core"
                >
                  {SITE_CONFIG.parentCompany.email}
                </a>
              </div>
              <Link
                href="/contact"
                className="mt-4 inline-flex w-full h-11 items-center justify-center rounded-xl bg-servora-navy text-xs font-bold text-white hover:bg-servora-core transition-colors"
              >
                Contact Our Nairobi Team &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* --- SECTION 13: KENYA FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Regional FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Hospitality Software in Kenya — FAQ
              </h2>
            </div>

            <FaqAccordionClient faqs={KENYA_FAQS} />
          </div>
        </section>

        {/* --- SECTION 14: FINAL CONVERSION CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Ready to Run Your Hospitality Business Smarter?
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              See how Servora connects restaurant sales, M-Pesa payments, kitchen operations, ingredient inventory, procurement, and business analytics in one integrated platform.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Book a Nairobi Demo &rarr;
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                View Pricing in KES
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}