// apps/web/app/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'About Servora | Mavora Technologies – Hospitality Software Kenya',
  description:
    'Discover Servora, the hospitality management and restaurant POS platform developed by Mavora Technologies Ltd in Nairobi, Kenya. Learn about our technology, platform capabilities, and approach to simplifying hospitality operations.',
  path: '/about',
  keywords: [
    'About Servora',
    'Mavora Technologies Ltd',
    'Hospitality Software Company Kenya',
    'Restaurant POS Software Developer Kenya',
    'Hotel Management Software Kenya',
    'Hospitality Management Platform',
    'Restaurant Management Technology',
    'Restaurant Inventory Management Software',
    'Restaurant POS and Inventory System',
    'Hospitality Technology East Africa',
  ],
});

const OPERATIONAL_CHALLENGES = [
  {
    problem: 'Disconnected Operations',
    context: 'Sales, inventory, purchasing, and reporting managed through separate tools.',
    approach:
      'Servora brings POS billing, kitchen routing, stockrooms, procurement, and analytics into one shared data model.',
  },
  {
    problem: 'Limited Stock Visibility',
    context: 'Difficulty monitoring ingredient usage, wastage, stock movement, and replenishment.',
    approach:
      'Recipe Bills of Materials (BOM) link menu sales directly to ingredient-level stock deductions and movement ledgers.',
  },
  {
    problem: 'Inconsistent Kitchen Coordination',
    context: 'Delays caused by manual order communication and disconnected kitchen workflows.',
    approach:
      'Multi-station Kitchen Display System (KDS) routing sends items straight to Grill, Bar, Cold Pantry, and Expediter screens.',
  },
  {
    problem: 'Limited Financial Visibility',
    context: 'Difficulty understanding sales performance, food costs, and operational margins.',
    approach:
      'Executive reporting connects daily revenue, tender reconciliation, and theoretical vs. actual food cost in real time.',
  },
  {
    problem: 'Manual Administrative Processes',
    context: 'Repetitive reconciliation tasks that consume time and increase the risk of errors.',
    approach:
      'Automated M-Pesa Daraja callbacks, blind till closeouts, and structured GRN checks reduce manual spreadsheet work.',
  },
  {
    problem: 'Multi-Branch Complexity',
    context: 'Difficulty maintaining consistent oversight across multiple hospitality locations.',
    approach:
      'Multi-tenant branch isolation pairs outlet-level autonomy with centralized head-office visibility and stock transfers.',
  },
];

const PLATFORM_WORKFLOWS = [
  'Point of Sale & Order Management',
  'Table & Floor Service Management',
  'Kitchen Display System (KDS)',
  'Menu & Product Catalogs',
  'Recipe & Bill of Materials (BOM)',
  'Ingredient-Level Inventory Tracking',
  'Stock Transfers & Adjustments',
  'Purchasing & Supplier Management',
  'M-Pesa & Multi-Tender Payments',
  'Staff & Role-Based Access Control',
  'Sales & Business Analytics',
  'Multi-Branch Operations',
];

const TECHNOLOGY_PRINCIPLES = [
  {
    number: '01',
    title: 'Operational Speed & Resilience',
    description:
      'Engineered for responsive touchscreen POS workflows with offline-aware local queueing so supported terminal operations remain steady during temporary internet interruptions.',
  },
  {
    number: '02',
    title: 'Localized Payment & Business Workflows',
    description:
      'Built around Kenyan hospitality realities—supporting Safaricom M-Pesa Daraja STK Push and C2B callbacks, KES currency billing, configurable tax rules, and KRA eTIMS invoicing readiness.',
  },
  {
    number: '03',
    title: 'Inventory Accuracy & Cost Visibility',
    description:
      'Connects menu items to recipe BOMs for automatic ingredient-level stock deduction, food-cost calculations, stock movement visibility, and waste tracking.',
  },
  {
    number: '04',
    title: 'Security & Operational Accountability',
    description:
      'Enforces strict multi-tenant branch isolation, granular role-based access control (RBAC), blind till custody, and immutable audit logs across every shift.',
  },
];

const INDUSTRIES_SERVED = [
  { name: 'Restaurants', detail: 'Full table service, modifiers, split checks & KDS.', href: '/solutions/restaurants' },
  { name: 'Hotels & Hotel Restaurants', detail: 'Multi-outlet F&B, central stores & consolidated reporting.', href: '/solutions/hotels' },
  { name: 'Cafés & Coffee Shops', detail: 'High-speed counter ordering & ingredient portioning.', href: '/solutions/restaurants' },
  { name: 'Bars & Lounges', detail: 'Open bar tabs, pour-cost control & blind till handovers.', href: '/solutions/bars-lounges' },
  { name: 'Fast-Food Outlets', detail: 'Combo bundles, express checkout & kitchen SLA timers.', href: '/solutions/cloud-kitchens' },
  { name: 'Bakeries & Grill Houses', detail: 'Batch production yields & BOM recipe costing.', href: '/solutions/restaurants' },
  { name: 'Cloud Kitchens', detail: 'Multi-station prep displays & delivery dispatch tracking.', href: '/solutions/cloud-kitchens' },
  { name: 'Multi-Branch Groups', detail: 'Inter-branch transfers & centralized outlet oversight.', href: '/features' },
];

const COMMITMENT_PRINCIPLES = [
  {
    title: 'Practical Business Value',
    detail: 'Every module is built to solve real daily floor, kitchen, and back-office friction.',
  },
  {
    title: 'Connected Operational Workflows',
    detail: 'Sales, recipes, stockrooms, and finance share one live operational record.',
  },
  {
    title: 'Clear Management Visibility',
    detail: 'Owners and managers get timely, structured reporting without manual spreadsheet assembly.',
  },
  {
    title: 'Usability for Hospitality Teams',
    detail: 'Clean interfaces designed for fast onboarding across waiters, cashiers, chefs, and storekeepers.',
  },
  {
    title: 'Continuous Product Improvement',
    detail: 'Iteratively refined alongside real hospitality workflows in Kenya and East Africa.',
  },
  {
    title: 'Scalable Operational Management',
    detail: 'Architected to support a single busy outlet or a growing multi-branch hospitality group.',
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM ABOUT HERO --- */}
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/50 to-servora-pale border-b border-gray-200/60">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link href="/" className="hover:text-servora-core font-semibold">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-bold text-servora-navy">About Mavora Technologies</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                About Servora &amp; Mavora Technologies
              </span>

              <h1 className="w-full text-[clamp(1.9rem,3.6vw,3.35rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Technology That Simplifies{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Hospitality Operations.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Servora is a modern hospitality management platform developed by{' '}
                <strong className="font-bold text-servora-navy">
                  {SITE_CONFIG.parentCompany.name}
                </strong>{' '}
                to help restaurants, hotels, cafés, and hospitality businesses streamline operations, improve control, and make smarter business decisions.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/features"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Explore Servora &rarr;
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Contact Our Team
                </Link>
              </div>
            </div>

            {/* Right Visual: Connected Hospitality Operations */}
            <div className="lg:col-span-6 w-full">
              <div className="rounded-3xl bg-servora-navy p-2.5 sm:p-3 shadow-2xl ring-1 ring-white/15 overflow-hidden">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/kds-kitchen-display.png"
                    alt="Chef coordinating active restaurant orders on a digital Kitchen Display System powered by Servora"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Servora &bull; Simplify Service. Grow Smarter.
                  </span>
                  <span className="font-mono text-servora-teal">
                    By {SITE_CONFIG.parentCompany.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: WHO WE ARE --- */}
        <section className="py-16 sm:py-24 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Company &amp; Product Identity
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Who We Are
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                {SITE_CONFIG.canonicalBrandDefinition}
              </p>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Headquartered in Kilimani, Nairobi,{' '}
                <a
                  href={SITE_CONFIG.parentCompany.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-servora-core hover:underline"
                >
                  {SITE_CONFIG.parentCompany.name}
                </a>{' '}
                is the technology company behind Servora. We design and maintain Servora as an integrated hospitality management and restaurant POS platform—bringing daily service, kitchen coordination, stock control, supplier procurement, and management reporting into one connected system.
              </p>
              <div className="mt-6 flex flex-wrap gap-5 text-xs font-bold">
                <Link href="/features" className="text-servora-core hover:underline">
                  Inspect Platform Capabilities &rarr;
                </Link>
                <Link href="/solutions/restaurants" className="text-servora-core hover:underline">
                  Explore Restaurant Solutions &rarr;
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-servora-pale border border-gray-200/90 p-7 sm:p-8 space-y-5">
                <div className="pb-4 border-b border-gray-200/80">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-servora-core font-bold">
                    The Developer
                  </span>
                  <h3 className="text-lg font-extrabold text-servora-navy mt-1">
                    {SITE_CONFIG.parentCompany.name}
                  </h3>
                  <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                    Software engineering company headquartered in Kilimani, Nairobi, building practical enterprise systems for East African businesses.
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-servora-teal font-bold">
                    The Platform
                  </span>
                  <h3 className="text-lg font-extrabold text-servora-navy mt-1">
                    Servora Hospitality OS
                  </h3>
                  <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                    Unified hotel F&amp;B and restaurant management platform connecting POS checkout, KDS screens, recipe BOM inventory, M-Pesa payments, and BI analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: THE PROBLEM WE ARE SOLVING --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Why Servora Exists
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Built Around the Real Challenges of Hospitality Businesses
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Running a restaurant, café, bar, or hotel F&amp;B outlet demands speed at the counter and discipline behind the scenes. Servora is designed to help teams manage six core operational challenges more effectively.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {OPERATIONAL_CHALLENGES.map((item) => (
                <article
                  key={item.problem}
                  className="rounded-2xl bg-white border border-gray-200/80 p-6 flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <h3 className="text-base font-extrabold text-servora-navy">{item.problem}</h3>
                    <p className="mt-2 text-xs text-servora-deepTeal/85 leading-relaxed">
                      {item.context}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core">
                      How Servora Helps
                    </span>
                    <p className="mt-1 text-xs font-medium text-servora-navy leading-relaxed">
                      {item.approach}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 4: OUR MISSION, VISION AND APPROACH --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Mission - Navy Highlight */}
            <div className="lg:col-span-5 rounded-3xl bg-servora-navy text-white p-8 sm:p-10 flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-servora-teal">
                  Our Mission
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-snug">
                  Simplify Hospitality Operations Through Practical, Connected Technology.
                </h2>
              </div>
              <p className="mt-6 text-xs sm:text-sm text-gray-300 leading-relaxed">
                To simplify hospitality operations through connected, practical, and reliable technology that helps businesses operate with greater control and efficiency.
              </p>
            </div>

            {/* Vision & Approach Stacked */}
            <div className="lg:col-span-7 grid grid-cols-1 gap-6">
              <div className="rounded-3xl bg-servora-pale border border-gray-200/90 p-7 sm:p-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-servora-core">
                  Our Vision
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-servora-navy">
                  A More Connected, Sustainable Hospitality Industry
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  To contribute to a more connected hospitality industry where businesses can manage operations intelligently, serve customers better, and grow sustainably.
                </p>
              </div>

              <div className="rounded-3xl bg-white border-2 border-servora-core/20 p-7 sm:p-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-servora-teal">
                  Our Approach
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-servora-navy">
                  Engineered Around Real Daily Workflows
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Build technology around real business workflows—connecting front-of-house service, stockrooms, kitchen operations, financial visibility, and management oversight in one system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: THE SERVORA PLATFORM --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                The Servora Platform
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                One Connected Platform. Multiple Operational Workflows.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                A core principle of Servora is connecting front-of-house sales directly to back-of-house inventory. When a menu item is sold at the POS, its configured recipe Bill of Materials (BOM) drives exact ingredient consumption and stock tracking—giving operators live visibility into stock balances and food costs.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-servora-navy">
                {PLATFORM_WORKFLOWS.map((workflow) => (
                  <div
                    key={workflow}
                    className="flex items-center gap-2 rounded-xl bg-white border border-gray-200/70 px-3.5 py-2.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-servora-teal flex-shrink-0" />
                    <span>{workflow}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <Link
                  href="/features"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-navy px-6 text-xs font-bold text-white hover:bg-servora-core transition-colors"
                >
                  Explore All Platform Features &rarr;
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-md bg-servora-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/resources/recipe-bom-food-cost.png"
                  alt="Chef preparing measured ingredients alongside a Servora Recipe BOM screen showing automated stock deduction and food cost summary"
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 6: OUR TECHNOLOGY PRINCIPLES --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Engineering Standards
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Designed for the Demands of Modern Hospitality
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TECHNOLOGY_PRINCIPLES.map((pillar) => (
                <div
                  key={pillar.number}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-7 flex items-start gap-5"
                >
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-servora-core text-white font-mono text-sm font-extrabold flex-shrink-0">
                    {pillar.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold text-servora-navy">{pillar.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: OUR MARKET AND INDUSTRIES --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hospitality Focus
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Technology for Diverse Hospitality Businesses
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal">
                Every hospitality format runs its own service rhythm, yet all share the need for coordinated sales, kitchen execution, stock control, and management visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {INDUSTRIES_SERVED.map((ind) => (
                <Link
                  key={ind.name}
                  href={ind.href}
                  className="group rounded-2xl bg-white border border-gray-200/80 p-5 hover:border-servora-core hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-extrabold text-servora-navy group-hover:text-servora-core transition-colors">
                      {ind.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-servora-deepTeal leading-relaxed">
                      {ind.detail}
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-bold text-servora-core">Explore &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: OUR ROOTS AND HEADQUARTERS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <span className="text-servora-teal font-bold tracking-widest uppercase text-xs">
                Developer &amp; Headquarters
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                Developed in Nairobi. Built for Connected Hospitality Operations.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                {SITE_CONFIG.parentCompany.name} develops and supports Servora from our headquarters in Kilimani, Nairobi—working directly with hospitality businesses across Kenya, East Africa, and beyond.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-core px-6 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  Book a Consultation &rarr;
                </Link>
                <a
                  href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 px-6 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                >
                  Call {SITE_CONFIG.parentCompany.displayPhone}
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-3xl bg-white/5 border border-white/10 p-7 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-servora-teal">
                Corporate Office
              </span>
              <h3 className="text-xl font-extrabold text-white">
                {SITE_CONFIG.parentCompany.name}
              </h3>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Concert House, Wood Avenue, Kilimani
                <br />
                Nairobi, Kenya
              </p>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-1.5 text-xs">
                <a
                  href={SITE_CONFIG.parentCompany.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-servora-teal hover:underline font-semibold"
                >
                  {SITE_CONFIG.parentCompany.url}
                </a>
                <a
                  href={`mailto:${SITE_CONFIG.parentCompany.email}`}
                  className="text-gray-300 hover:text-white"
                >
                  {SITE_CONFIG.parentCompany.email}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 9: OUR COMMITMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Our Commitment
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Technology That Grows With Your Business
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {COMMITMENT_PRINCIPLES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6"
                >
                  <h3 className="text-base font-bold text-servora-navy mb-2">{item.title}</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 10: FINAL CALL TO ACTION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Let&apos;s Simplify the Way Your Hospitality Business Operates.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Discover how Servora connects your sales, kitchen, inventory, and management workflows in one integrated hospitality platform.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Book a Consultation &rarr;
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Explore Servora
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}