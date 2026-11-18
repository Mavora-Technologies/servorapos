// apps/web/app/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroVideoPlayer from '@/components/landing/HeroVideoPlayer';
import ProductShowcaseClient from '@/components/landing/ProductShowcaseClient';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hotel & Restaurant Management System in Kenya | Servora by Mavora Technologies',
  description:
    'Run your hospitality business smarter with Servora. Connect POS sales, restaurant operations, Kitchen Display Systems (KDS), recipe BOM inventory, procurement, M-Pesa payments, and business intelligence in one platform.',
  path: '/',
  keywords: [
    'Hotel Management System Kenya',
    'Restaurant Management Software Kenya',
    'Restaurant POS System Kenya',
    'Hotel POS Software',
    'Hospitality Management Software',
    'Restaurant Inventory Management',
    'Kitchen Display System',
    'Restaurant Billing Software',
    'M-Pesa POS Integration',
    'Restaurant Recipe Management',
    'Multi-Branch Restaurant Management',
    'Hotel Restaurant Management Software',
    'Servora by Mavora Technologies',
  ],
});

const TRUST_CAPABILITIES = [
  {
    title: 'M-Pesa Daraja Integration',
    detail: 'Instant STK Push & C2B Till reconciliation',
  },
  {
    title: 'Multi-Branch Management',
    detail: 'Centralized control with outlet isolation',
  },
  {
    title: 'Real-Time Inventory & BOM',
    detail: 'Automated gram-level recipe stock deduction',
  },
  {
    title: 'Kitchen Display System',
    detail: 'Station routing across Grill, Bar & Pantry',
  },
  {
    title: 'Business Analytics & BI',
    detail: 'Live revenue, food cost & margin tracking',
  },
  {
    title: 'POS Hardware Compatibility',
    detail: 'Touch terminals, thermal printers & drawers',
  },
];

const INDUSTRY_VERTICALS = [
  {
    category: 'Hotels & Resorts',
    badge: 'Multi-Outlet F&B',
    description:
      'Unify hotel restaurants, poolside bars, banquet halls, and room service dining into one centralized hospitality management system.',
    benefit: 'Consolidated guest billing & central store transfers',
    href: '/solutions/hotels',
  },
  {
    category: 'Restaurants',
    badge: 'Full Table Service',
    description:
      'Coordinate host desk seating, visual floor layouts, course-by-course kitchen firing, split checks, and table-side payments.',
    benefit: 'Faster table turnover & accurate kitchen pacing',
    href: '/solutions/restaurants',
  },
  {
    category: 'Cafés & Coffee Shops',
    badge: 'High-Speed Counter',
    description:
      'Breeze through morning rush hours with rapid modifier entry, barista display routing, milk/bean recipe tracking, and loyalty rewards.',
    benefit: 'Rapid checkout & automated ingredient control',
    href: '/solutions/restaurants',
  },
  {
    category: 'Bars & Lounges',
    badge: 'Nightlife & Tabs',
    description:
      'Manage open bar tabs, VIP bottle service, pour-cost recipe tracking, blind cashier shift handovers, and instant M-Pesa STK Push checkout.',
    benefit: 'Strict stock variance & shift cash custody',
    href: '/solutions/bars-lounges',
  },
  {
    category: 'Fast Food & Quick Service (QSR)',
    badge: 'Express Checkout',
    description:
      'Accelerate counter ordering and combo meal bundling with instant kitchen assembly routing and packaging inventory deduction.',
    benefit: 'High-throughput ordering & SLA timers',
    href: '/solutions/cloud-kitchens',
  },
  {
    category: 'Bakeries & Grill Houses',
    badge: 'Batch & Portioning',
    description:
      'Track raw flour, meat cuts, marinades, and daily production batches with strict Bill of Materials (BOM) recipe costing.',
    benefit: 'Standardized portions & wastage control',
    href: '/solutions/restaurants',
  },
  {
    category: 'Cloud Kitchens',
    badge: 'Delivery & Dispatch',
    description:
      'Orchestrate multi-brand virtual kitchens with dedicated prep station KDS screens, packaging BOMs, and rider dispatch handoffs.',
    benefit: 'Streamlined prep routing & order accuracy',
    href: '/solutions/cloud-kitchens',
  },
  {
    category: 'Multi-Branch Hospitality Groups',
    badge: 'Enterprise Scale',
    description:
      'Standardize menus, pricing, supplier procurement, and inter-branch stock transfers across every outlet from head office.',
    benefit: 'Real-time cross-branch executive BI reporting',
    href: '/features',
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Customer Order',
    detail: 'Dine-in table, counter, takeaway, or room service order captured.',
  },
  {
    step: '02',
    title: 'POS Terminal',
    detail: 'Modifiers, tax rules, and waiter attribution logged instantaneously.',
  },
  {
    step: '03',
    title: 'Kitchen Display (KDS)',
    detail: 'Items split and routed to Grill, Bar, Cold Pantry, or Expediter screens.',
  },
  {
    step: '04',
    title: 'Recipe BOM Deduction',
    detail: 'Exact gram and unit quantities calculated from active dish recipes.',
  },
  {
    step: '05',
    title: 'Inventory Update',
    detail: 'Store balances depleted in real time and low-stock thresholds checked.',
  },
  {
    step: '06',
    title: 'Payment Reconciliation',
    detail: 'M-Pesa STK Push, C2B Till, card, or cash matched to cashier shift.',
  },
  {
    step: '07',
    title: 'Business Analytics',
    detail: 'Live revenue, food cost margins, and branch dashboards updated.',
  },
];

const WHY_CHOOSE_SERVORA = [
  {
    title: 'Unified Hospitality Management',
    description:
      'Replace fragmented tills, spreadsheets, and standalone stock software with a single connected platform covering front-of-house to back-office finance.',
  },
  {
    title: 'Improved Operational Visibility',
    description:
      'Monitor live floor occupancy, open tabs, active kitchen tickets, and cashier shift balances in real time from any authorized device.',
  },
  {
    title: 'Accurate Ingredient Tracking',
    description:
      'Enforce standardized recipe Bills of Materials (BOM) so every plate, drink, and takeaway order automatically deducts exact raw ingredients.',
  },
  {
    title: 'Reduced Manual Reconciliation',
    description:
      'Eliminate manual M-Pesa SMS verification and end-of-night spreadsheet balancing with automated Daraja API callbacks and shift ledgers.',
  },
  {
    title: 'Better Kitchen Coordination',
    description:
      'Keep chefs and service staff aligned with station-specific KDS screens, SLA timers, course firing, and instant order-ready notifications.',
  },
  {
    title: 'Multi-Branch Control',
    description:
      'Manage multiple restaurant or hotel outlets with strict tenant data isolation, inter-branch stock transfers, and centralized menu control.',
  },
  {
    title: 'Improved Financial Accountability',
    description:
      'Protect margins with role-based access permissions (RBAC), manager PIN approvals for voids/discounts, and blind cashier drawer counts.',
  },
  {
    title: 'Actionable Business Intelligence',
    description:
      'Identify high-margin dishes, track theoretical versus actual food costs, and analyze peak sales velocity with executive BI reports.',
  },
];

const HOMEPAGE_FAQS = [
  {
    question: 'What is Servora?',
    answer:
      'Servora is an integrated hotel, restaurant, and hospitality management platform that connects Point of Sale (POS) billing, Kitchen Display Systems (KDS), recipe-based inventory management, supplier procurement, table reservations, staff shifts, M-Pesa payments, and business analytics in one unified cloud and offline-resilient system.',
  },
  {
    question: 'Who developed Servora?',
    answer:
      'Servora is engineered and supported by Mavora Technologies Ltd, a software engineering company headquartered at Concert House, Wood Avenue, Kilimani, Nairobi, Kenya.',
  },
  {
    question: 'Which businesses can use Servora?',
    answer:
      'Servora is designed for hotels and resorts, fine-dining and casual restaurants, cafés and coffee shops, bars and lounges, fast-food and quick-service restaurants (QSR), bakeries, grill houses, cloud kitchens, and multi-branch hospitality groups.',
  },
  {
    question: 'Does Servora support M-Pesa?',
    answer:
      'Yes. Servora integrates natively with the Safaricom M-Pesa Daraja API to support instant STK Push prompts directly to the customer’s phone as well as automated C2B Till and Paybill payment callback reconciliation at the POS register.',
  },
  {
    question: 'Does Servora support KRA eTIMS?',
    answer:
      'Servora supports Kenyan Shilling (KES) billing, configurable tax breakdowns including 16% VAT and 2% Catering Levy, and is architected for KRA eTIMS fiscal invoice integration based on your business’s onboarding configuration.',
  },
  {
    question: 'How does recipe-based inventory deduction work?',
    answer:
      'Each menu item in Servora is mapped to a Bill of Materials (BOM) recipe specifying exact ingredient quantities, measurement units (grams, milliliters, pieces), and wastage allowances. Whenever an item is sold at the POS, Servora automatically deducts those exact ingredient quantities from stock and logs the movement.',
  },
  {
    question: 'Can Servora manage multiple branches?',
    answer:
      'Yes. Servora features multi-branch architecture that allows hospitality groups to manage separate outlets, branch-specific menus, inter-branch stock requisitions and transfers, and consolidated executive reporting from a single account.',
  },
  {
    question: 'Does Servora support kitchen display systems?',
    answer:
      'Yes. Servora includes a multi-station Kitchen Display System (KDS) that routes food and beverage items from a single bill to designated prep screens such as Grill, Hot Kitchen, Cold Pantry, Pastry, Bar, and Expediter.',
  },
  {
    question: 'Can restaurants manage reservations?',
    answer:
      'Yes. Servora provides visual dining floor plans, real-time table occupancy tracking, advance guest reservation scheduling, walk-in waitlist management, and guest CRM profiles.',
  },
  {
    question: 'How can a business request a demonstration?',
    answer:
      'You can request a personalized live demonstration by clicking any "Request a Live Demo" button on our website to visit the Contact page, or by calling Mavora Technologies Ltd directly at +254 795 707 823.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd data={buildFaqSchema(HOMEPAGE_FAQS)} />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 2: PREMIUM SPLIT-LAYOUT HERO WITH PROMOTIONAL VIDEO --- */}
        <section className="relative overflow-hidden pt-6 pb-10 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/60 to-servora-pale">
          <div
            aria-hidden="true"
            className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl w-full max-w-7xl overflow-hidden pointer-events-none"
          >
            <div
              className="aspect-[1155/678] w-full bg-gradient-to-tr from-servora-core to-servora-bright opacity-10 rounded-full"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>

          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Marketing Content & Conversion CTAs */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-x-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-servora-navy shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-servora-teal opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-servora-teal" />
                </span>
                <span className="text-servora-teal uppercase tracking-wider text-[10px]">
                  Servora 2.0
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-servora-deepTeal">
                  Smart Hospitality Management by Mavora Technologies
                </span>
              </div>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.35rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Complete Hotel &amp; Restaurant Management.{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  All in One Platform.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal font-normal">
                Run your hospitality business smarter with Servora. Connect POS sales, restaurant operations, kitchen workflows, inventory, procurement, payments, and business intelligence through one integrated management platform.
              </p>

              {/* CTA Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700 hover:scale-[1.01]"
                >
                  Request a Live Demo &rarr;
                </Link>
                <Link
                  href="/features"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Explore the Platform
                </Link>
              </div>

              {/* Compact Capability Indicators */}
              <div className="mt-7 pt-5 border-t border-gray-200/70 grid grid-cols-2 gap-x-4 gap-y-2.5 w-full max-w-lg text-xs font-semibold text-servora-navy">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Safaricom M-Pesa Daraja</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-core flex-shrink-0" />
                  <span>Touch POS &amp; Kitchen KDS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-bright flex-shrink-0" />
                  <span>Recipe BOM &amp; Inventory</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>Multi-Branch Cloud Control</span>
                </div>
              </div>
            </div>

            {/* Right Column: Official Promotional Video Centerpiece */}
            <div className="lg:col-span-6 w-full">
              <HeroVideoPlayer />
            </div>
          </div>
        </section>

        {/* --- SECTION 3: TRUST AND CAPABILITY BAR --- */}
        <section
          aria-label="Core Platform Capabilities"
          className="py-6 w-full bg-white border-y border-gray-200/70 px-4 sm:px-8 lg:px-16"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TRUST_CAPABILITIES.map((item) => (
              <div
                key={item.title}
                className="flex flex-col justify-between p-3.5 rounded-xl bg-servora-pale/60 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span className="text-xs font-bold text-servora-navy leading-tight">
                    {item.title}
                  </span>
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-1 leading-snug">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* --- SECTION 4: PLATFORM OVERVIEW (8-MODULE ASYMMETRICAL BENTO GRID) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Unified Hospitality Architecture
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight leading-tight">
                Everything Your Hospitality Business Needs. One Connected Platform.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Servora brings every critical hospitality operation into one intelligent management environment.
              </p>
            </div>

            {/* Bento Grid: 12-column asymmetrical layout on desktop, 2-col on tablet, 1-col on small mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 w-full">
              {/* 1. POS & Sales Management (Large 7-col card) */}
              <article className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold">
                      01 &bull; FRONT-OF-HOUSE POS
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Offline-Resilient
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-servora-navy mb-2">
                    Point of Sale &amp; Sales Management
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    High-speed touchscreen order entry built for Dine-In, Takeaway, Delivery, Bar Tabs, and Hotel Room Service. Manage modifiers, combo meals, course firing, and split bills without slowing down peak service.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy">
                    <span className="bg-servora-pale px-2.5 py-1 rounded-md">Split Checks</span>
                    <span className="bg-servora-pale px-2.5 py-1 rounded-md">Bar Tabs</span>
                    <span className="bg-servora-pale px-2.5 py-1 rounded-md">Thermal Receipts</span>
                  </div>
                  <Link href="/features" className="text-xs font-bold text-servora-core hover:underline">
                    Explore POS &rarr;
                  </Link>
                </div>
              </article>

              {/* 2. Kitchen Display & Order Management (5-col card) */}
              <article className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-servora-navy text-white shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-white/10 text-servora-teal font-mono text-xs font-bold">
                      02 &bull; CULINARY WORKFLOW
                    </span>
                    <span className="text-[11px] font-semibold text-servora-teal">
                      Real-Time SLA Timers
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mb-2">
                    Kitchen Display &amp; Order Management
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Route orders automatically to Grill, Bar, Cold Pantry, Pastry, and Expediter KDS screens. Monitor live preparation timers, course pacing, and staff bump velocity.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-300">
                    Multi-Station Ticket Routing
                  </span>
                  <Link href="/solutions/cloud-kitchens" className="text-xs font-bold text-servora-teal hover:underline">
                    Explore KDS &rarr;
                  </Link>
                </div>
              </article>

              {/* 3. Inventory & Recipe Management (5-col card) */}
              <article className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold mb-4">
                    03 &bull; RECIPE BOM ENGINE
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-servora-navy mb-2">
                    Inventory &amp; Recipe Management
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Map every menu dish and cocktail to a gram-level Bill of Materials (BOM). Automatically deduct raw ingredients on sale, track batch expiry, and audit food cost variance.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-servora-deepTeal">
                    Auto Stock Depletion on Sale
                  </span>
                  <Link href="/features" className="text-xs font-bold text-servora-core hover:underline">
                    Recipe Control &rarr;
                  </Link>
                </div>
              </article>

              {/* 4. Procurement & Supplier Management (7-col card) */}
              <article className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold">
                      04 &bull; SUPPLY CHAIN
                    </span>
                    <span className="text-[11px] font-semibold text-servora-deepTeal bg-servora-pale px-2.5 py-1 rounded-full">
                      PO &rarr; GRN &rarr; Invoice
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-servora-navy mb-2">
                    Procurement &amp; Supplier Management
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Control purchasing from kitchen requisition to supplier delivery. Generate Purchase Orders (POs), verify deliveries with Goods Received Notes (GRNs), track vendor pricing, and manage inter-branch stock transfers.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-servora-navy">
                    <span className="bg-servora-pale px-2.5 py-1 rounded-md">Purchase Orders</span>
                    <span className="bg-servora-pale px-2.5 py-1 rounded-md">GRN Verification</span>
                    <span className="bg-servora-pale px-2.5 py-1 rounded-md">Store Transfers</span>
                  </div>
                  <Link href="/features" className="text-xs font-bold text-servora-core hover:underline">
                    Procurement Suite &rarr;
                  </Link>
                </div>
              </article>

              {/* 5. Table Reservations & Guest Management (3-col card) */}
              <article className="lg:col-span-3 p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-[11px] font-bold mb-3">
                    05 &bull; FLOOR &amp; CRM
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mb-2">
                    Table Reservations &amp; Guest Management
                  </h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">
                    Interactive floor plans, live table occupancy states, advance bookings, waitlists, and guest loyalty profiles.
                  </p>
                </div>
                <Link
                  href="/solutions/restaurants"
                  className="mt-5 pt-3 border-t border-gray-100 text-xs font-bold text-servora-core hover:underline inline-block"
                >
                  Floor Management &rarr;
                </Link>
              </article>

              {/* 6. Staff & Shift Management (3-col card) */}
              <article className="lg:col-span-3 p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-[11px] font-bold mb-3">
                    06 &bull; WORKFORCE
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mb-2">
                    Staff &amp; Shift Management
                  </h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">
                    Role-based access control (RBAC), shift rosters, clock-in attendance, waiter performance, and manager PIN approvals.
                  </p>
                </div>
                <Link
                  href="/features"
                  className="mt-5 pt-3 border-t border-gray-100 text-xs font-bold text-servora-core hover:underline inline-block"
                >
                  Workforce Controls &rarr;
                </Link>
              </article>

              {/* 7. Payments & Financial Operations (3-col card) */}
              <article className="lg:col-span-3 p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-[11px] font-bold mb-3">
                    07 &bull; PAYMENTS
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mb-2">
                    Payments &amp; Financial Operations
                  </h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">
                    Safaricom M-Pesa Daraja STK Push, C2B Till callbacks, split tenders, blind cashier drawer counts, and KRA eTIMS readiness.
                  </p>
                </div>
                <Link
                  href="/hospitality-software-kenya"
                  className="mt-5 pt-3 border-t border-gray-100 text-xs font-bold text-servora-core hover:underline inline-block"
                >
                  M-Pesa &amp; Finance &rarr;
                </Link>
              </article>

              {/* 8. Business Intelligence & Analytics (3-col card) */}
              <article className="lg:col-span-3 p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-servora-core/10 text-servora-core font-mono text-[11px] font-bold mb-3">
                    08 &bull; ANALYTICS
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mb-2">
                    Business Intelligence &amp; Analytics
                  </h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">
                    Executive revenue dashboards, menu profitability matrices, food cost reports, and multi-branch performance comparisons.
                  </p>
                </div>
                <Link
                  href="/features"
                  className="mt-5 pt-3 border-t border-gray-100 text-xs font-bold text-servora-core hover:underline inline-block"
                >
                  Executive BI &rarr;
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: INTERACTIVE PRODUCT SHOWCASE --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Interactive Platform Walkthrough
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Experience the Power of Connected Hospitality Management
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Select any operational module below to inspect how Servora synchronizes front-of-house service, kitchen preparation, stockrooms, and financial reporting.
              </p>
            </div>

            <ProductShowcaseClient />
          </div>
        </section>

        {/* --- SECTION 6: INDUSTRY-SPECIFIC SOLUTIONS (8 VERTICALS) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Tailored Hospitality Verticals
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Built for Every Hospitality Business
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                From boutique hotels and fine-dining restaurants to high-volume bars, cafés, and multi-branch cloud kitchens, Servora adapts to your exact operational model.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {INDUSTRY_VERTICALS.map((vertical) => (
                <article
                  key={vertical.category}
                  className="rounded-3xl bg-white border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-servora-core transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Branded Visual Header Banner */}
                    <div className="h-28 bg-gradient-to-br from-servora-navy via-[#0a2e73] to-servora-core p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-servora-teal/20 blur-xl pointer-events-none" />
                      <span className="inline-flex self-start rounded-full bg-white/15 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-servora-teal uppercase tracking-wider">
                        {vertical.badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                        {vertical.category}
                      </h3>
                    </div>

                    <div className="p-6 pb-4">
                      <p className="text-xs text-servora-deepTeal leading-relaxed">
                        {vertical.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-servora-navy">
                      <span className="w-1.5 h-1.5 rounded-full bg-servora-teal flex-shrink-0" />
                      <span>{vertical.benefit}</span>
                    </div>
                    <Link
                      href={vertical.href}
                      className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                    >
                      Explore Solution &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: CONNECTED HOSPITALITY OPERATIONS WORKFLOW --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-servora-core/25 blur-3xl pointer-events-none"
          />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                Automated Transaction Lifecycle
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                Connected Hospitality Operations in Real Time
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
                Every customer order in Servora triggers an automated chain of operational updates—routing tickets to kitchen stations, deducting recipe ingredients, reconciling M-Pesa payments, and updating executive dashboards simultaneously.
              </p>
            </div>

            {/* 7-Stage Connected Workflow Pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
              {WORKFLOW_STEPS.map((item, idx) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between hover:border-servora-teal/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2 py-0.5 rounded">
                        STEP {item.step}
                      </span>
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <span className="hidden lg:inline text-gray-400 font-mono text-xs">&rarr;</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: BUILT FOR KENYA AND EAST AFRICA --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col gap-5">
              <span className="inline-flex self-start rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Built for Kenya &amp; East Africa
              </span>
              <h2 className="text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy leading-tight tracking-tight">
                Hospitality Technology Designed for the African Market
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                {SITE_CONFIG.canonicalBrandDefinition} Engineered in Nairobi for regional operational realities, Servora combines native Safaricom M-Pesa Daraja payment automation, configurable Kenyan tax compliance, and local POS hardware integration.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-bold text-servora-navy">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/80">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Safaricom M-Pesa Daraja API (STK &amp; C2B)</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/80">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Kenyan Shilling (KES) &amp; Multi-Currency</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/80">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>16% VAT, 2% Catering Levy &amp; eTIMS Ready</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/80">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Thermal Receipt Printers &amp; Cash Drawers</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/80">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Offline Survivability &amp; Auto Cloud Sync</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-servora-pale border border-gray-200/80">
                  <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                  <span>Nairobi Onboarding &amp; Technical Support</span>
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Link
                  href="/hospitality-software-kenya"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-navy px-7 text-xs font-bold text-white shadow-sm transition-all hover:bg-servora-core"
                >
                  Explore Kenya &amp; East Africa Hub &rarr;
                </Link>
                <Link
                  href="/hardware-pos"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-xs font-bold text-servora-navy transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Compatible POS Hardware
                </Link>
              </div>
            </div>

            {/* Right Card: Mavora Technologies Engineering & Local Support */}
            <div className="lg:col-span-5 w-full rounded-3xl bg-servora-pale p-7 sm:p-9 border border-gray-200/90 shadow-md flex flex-col justify-between gap-5">
              <div className="border-b border-gray-200 pb-4">
                <span className="text-[10px] font-bold text-servora-core uppercase tracking-wider">
                  Developed by Mavora Technologies Ltd
                </span>
                <h3 className="text-xl font-extrabold text-servora-navy mt-1">
                  Direct Engineering &amp; On-Site Deployment
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Work directly with our Nairobi engineering and implementation specialists to configure your menus, recipe BOMs, kitchen display stations, tax profiles, and POS terminals.
              </p>
              <div className="p-5 rounded-2xl bg-white border border-gray-200 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-servora-navy">
                  Mavora Technologies Ltd — Headquarters
                </span>
                <span className="text-xs text-servora-deepTeal font-mono">
                  Concert House, Wood Avenue, Kilimani - Nairobi, Kenya
                </span>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold">
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
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 9: WHY CHOOSE SERVORA (8 ENTERPRISE PILLARS) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Enterprise Operational Advantage
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Why Hospitality Leaders Choose Servora
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Built for accountability, speed, and multi-outlet scalability across every shift.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WHY_CHOOSE_SERVORA.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-servora-core transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core font-mono text-xs font-bold mb-4">
                      0{index + 1}
                    </span>
                    <h3 className="text-base font-bold text-servora-navy mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 11: FREQUENTLY ASKED QUESTIONS (10 EXPANDABLE ACCORDIONS) --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Answers &amp; Capabilities
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Frequently Asked Questions About Servora
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal">
                Clear, factual answers covering Servora’s architecture, M-Pesa integration, recipe costing, and deployment.
              </p>
            </div>

            <FaqAccordionClient faqs={HOMEPAGE_FAQS} />
          </div>
        </section>

        {/* --- SECTION 12: FINAL CONVERSION SECTION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Ready to Transform Your Hospitality Operations?
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed font-normal">
              Discover how Servora can simplify your restaurant and hotel operations through connected technology, intelligent inventory management, and real-time business insights.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale hover:scale-[1.02]"
              >
                Book a Live Demo &rarr;
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
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