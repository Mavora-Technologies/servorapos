// apps/web/app/resources/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import ResourceLibraryClient from '@/components/resources/ResourceLibraryClient';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';
import { RESOURCE_ARTICLES, getResourceCategories } from '@/lib/resources/articles';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hospitality & Restaurant Management Guides | Servora Resources',
  description:
    'Expert guides, operational playbooks, and best practices for hotel F&B, restaurant POS systems, M-Pesa integration, recipe costing, and KDS workflow optimization in Kenya and East Africa.',
  path: '/resources',
  keywords: [
    'Restaurant Management Guides Kenya',
    'Restaurant POS System Kenya',
    'How to Choose Restaurant POS',
    'Restaurant Food Costing',
    'Restaurant Recipe Management',
    'Restaurant Inventory Management',
    'Kitchen Display System',
    'M-Pesa Restaurant Payments',
    'Hotel F&B Management',
    'Servora Hospitality Resources',
  ],
});

const TOPIC_THEMES = [
  {
    title: 'Restaurant POS Technology',
    items: [
      'Choosing the right POS',
      'Restaurant order management',
      'POS hardware & thermal printers',
      'Offline-resilient operations',
    ],
    href: '/resources/best-restaurant-pos-system-kenya',
    cta: 'Read POS Guide',
  },
  {
    title: 'Inventory & Food Cost Management',
    items: [
      'Recipe BOM costing',
      'Ingredient-level tracking',
      'Stock & bin control',
      'Wastage & food cost variance',
    ],
    href: '/resources/restaurant-recipe-costing-food-cost',
    cta: 'Read Costing Guide',
  },
  {
    title: 'Kitchen Operations',
    items: [
      'Kitchen Display Systems (KDS)',
      'Multi-station ticket routing',
      'Order turnaround & SLA timers',
      'Kitchen workflow optimization',
    ],
    href: '/resources/why-kitchen-display-system-outperforms-paper',
    cta: 'Read KDS Guide',
  },
  {
    title: 'Payments & Financial Management',
    items: [
      'Safaricom M-Pesa Daraja',
      'Instant STK Push & C2B match',
      'Cashier shift reconciliation',
      'KRA eTIMS & tax reporting',
    ],
    href: '/hospitality-software-kenya',
    cta: 'Explore Kenya Hub',
  },
  {
    title: 'Hospitality Business Management',
    items: [
      'Restaurant & hotel F&B operations',
      'Staff RBAC & shift accountability',
      'Multi-branch stock transfers',
      'Executive business analytics',
    ],
    href: '/features',
    cta: 'Explore Platform',
  },
];

const OPERATIONAL_CHALLENGES = [
  {
    challenge: 'Disconnected Sales & Inventory',
    solution: 'Link POS orders directly to recipe BOMs so stock updates automatically on sale.',
  },
  {
    challenge: 'Manual Ingredient Tracking',
    solution: 'Replace end-of-month spreadsheets with unit-converted ingredient ledgers and bin cards.',
  },
  {
    challenge: 'Inconsistent Kitchen Communication',
    solution: 'Route orders digitally to Grill, Bar, Cold Pantry, and Expediter KDS screens.',
  },
  {
    challenge: 'Procurement Visibility Gaps',
    solution: 'Standardize purchase requests, POs, GRN checks, and supplier invoices in one workflow.',
  },
  {
    challenge: 'Payment Reconciliation Friction',
    solution: 'Automate M-Pesa STK Push and C2B Till callbacks alongside blind till counts.',
  },
  {
    challenge: 'Limited Executive Visibility',
    solution: 'Surface live revenue, food cost variance, and multi-branch performance in real time.',
  },
];

const PRODUCT_EDUCATION_LINKS = [
  { title: 'Point of Sale (POS)', desc: 'Dine-In, Takeaway, Delivery & Bar Tabs', href: '/features' },
  { title: 'Kitchen Display System', desc: 'Station routing & live SLA timers', href: '/solutions/cloud-kitchens' },
  { title: 'Inventory & Recipe Costing', desc: 'BOM stock deduction & wastage logs', href: '/features' },
  { title: 'Supplier Procurement', desc: 'POs, GRNs & inter-branch transfers', href: '/features' },
  { title: 'M-Pesa Payments & eTIMS', desc: 'Daraja STK Push & C2B reconciliation', href: '/hospitality-software-kenya' },
  { title: 'Workforce & Analytics', desc: 'RBAC, shifts & menu profitability BI', href: '/pricing' },
];

const RESOURCES_FAQS = [
  {
    question: 'What topics does the Servora Resources Centre cover?',
    answer:
      'The Servora Knowledge Centre covers restaurant POS selection, Safaricom M-Pesa Daraja payment workflows, KRA eTIMS tax readiness, recipe Bill of Materials (BOM) food cost control, Kitchen Display Systems (KDS), and multi-branch hospitality operations.',
  },
  {
    question: 'Who can benefit from these hospitality guides?',
    answer:
      'Our guides are written for restaurant owners, hotel food-and-beverage directors, café and bar managers, executive chefs, procurement leads, and finance teams operating in Kenya and East Africa.',
  },
  {
    question: 'Are the resources relevant to restaurants in Kenya?',
    answer:
      'Yes. Every playbook reflects local operational realities—including Safaricom M-Pesa STK Push and C2B till reconciliation, KES billing, 16% VAT and 2% Catering Levy configuration, and offline-resilient POS architecture.',
  },
  {
    question: 'How can I learn more about Servora’s features?',
    answer:
      'Visit our Platform Features page to inspect all integrated modules—from POS and KDS to recipe BOM inventory, procurement, and business intelligence.',
  },
  {
    question: 'How can I request a Servora product demonstration?',
    answer:
      'Click "Request a Live Demo" anywhere on this page to reach our Nairobi team on the Contact page, or call Mavora Technologies Ltd directly.',
  },
];

export default function ResourcesPage() {
  const categories = getResourceCategories();
  const featuredArticle = RESOURCE_ARTICLES[0];

  const articlesSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Servora Hospitality & Restaurant Management Guides',
    url: `${SITE_CONFIG.url}/resources`,
    publisher: {
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
    hasPart: RESOURCE_ARTICLES.map((art) => ({
      '@type': 'Article',
      headline: art.title,
      description: art.excerpt,
      datePublished: art.date,
      url: `${SITE_CONFIG.url}/resources/${art.slug}`,
      author: {
        '@type': 'Organization',
        name: SITE_CONFIG.parentCompany.name,
      },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Resources', path: '/resources' },
          ]),
          articlesSchema,
          buildFaqSchema(RESOURCES_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM KNOWLEDGE HUB HERO --- */}
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/50 to-servora-pale border-b border-gray-200/60">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link href="/" className="hover:text-servora-core font-semibold">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-bold text-servora-navy">Resources &amp; Guides</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Servora Knowledge Centre
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Insights That Help Hospitality Businesses{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Operate Smarter.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Explore practical hospitality guides, restaurant technology insights, operational playbooks, and expert resources designed to help businesses improve service delivery, manage costs, and make informed decisions.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <a
                  href="#resource-library"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Explore Guides &rarr;
                </a>
                <Link
                  href="/features"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Discover Servora
                </Link>
              </div>
            </div>

            {/* Editorial Visual Panel */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-3xl bg-servora-navy p-6 sm:p-7 text-white shadow-2xl ring-1 ring-white/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-servora-teal">
                  Editorial Focus Areas
                </span>
                <h2 className="text-lg font-extrabold mt-2">
                  Built for Kenyan &amp; East African Hospitality Leaders
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="font-bold text-white">POS &amp; M-Pesa</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">Daraja STK &amp; eTIMS</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="font-bold text-white">Recipe BOMs</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">Food cost &amp; margins</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="font-bold text-white">Kitchen KDS</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">Station routing &amp; SLAs</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="font-bold text-white">Multi-Branch</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">Transfers &amp; BI control</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: FEATURED RESOURCE --- */}
        <section className="py-14 sm:py-16 w-full bg-white px-4 sm:px-8 lg:px-16 border-b border-gray-200/60">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Featured Guide
              </span>
            </div>

            <article className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-gray-200/90 bg-servora-pale shadow-sm">
              {/* Featured Cover Image */}
              <div className="lg:col-span-5 relative min-h-[260px] sm:min-h-[300px] overflow-hidden bg-servora-navy text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredArticle.coverImage}
                  alt={featuredArticle.coverAlt}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-servora-navy/90 via-servora-navy/40 to-servora-navy/25" />

                <div className="relative z-10 h-full p-7 sm:p-9 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-servora-navy/75 backdrop-blur-xs px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/15">
                      {featuredArticle.category}
                    </span>
                    <span className="rounded-full bg-servora-navy/75 backdrop-blur-xs px-2.5 py-1 text-xs font-mono text-gray-100">
                      {featuredArticle.readTime}
                    </span>
                  </div>
                  <div className="mt-10">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-servora-teal">
                      {featuredArticle.badgeLabel}
                    </span>
                    <p className="text-xs text-gray-200 mt-1.5">
                      Published <time dateTime={featuredArticle.date}>{featuredArticle.date}</time>
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-white">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy leading-tight">
                    <Link
                      href={`/resources/${featuredArticle.slug}`}
                      className="hover:text-servora-core transition-colors"
                    >
                      {featuredArticle.title}
                    </Link>
                  </h2>
                  <p className="mt-4 text-sm sm:text-base text-servora-deepTeal leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                </div>

                <div className="mt-7 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  <Link
                    href={`/resources/${featuredArticle.slug}`}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-core px-6 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Read Full Guide &rarr;
                  </Link>
                  <span className="text-xs text-servora-deepTeal font-medium">
                    By {SITE_CONFIG.parentCompany.name}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* --- SECTIONS 3, 4 & 9: SEARCHABLE & FILTERABLE ARTICLE LIBRARY --- */}
        <section
          id="resource-library"
          className="py-16 sm:py-24 w-full bg-servora-pale px-4 sm:px-8 lg:px-16 scroll-mt-20"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Latest Guides &amp; Playbooks
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Hospitality &amp; Restaurant Management Library
              </h2>
            </div>

            <ResourceLibraryClient articles={RESOURCE_ARTICLES} categories={categories} />
          </div>
        </section>

        {/* --- SECTION 5: EDITORIAL CONTENT EXPLORER --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Topic Directory
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Explore Hospitality Topics
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {TOPIC_THEMES.map((theme) => (
                <div
                  key={theme.title}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-extrabold text-servora-navy mb-3">
                      {theme.title}
                    </h3>
                    <ul className="space-y-2 text-xs text-servora-deepTeal">
                      {theme.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-servora-teal mt-1.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={theme.href}
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    {theme.cta} &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: WHY HOSPITALITY BUSINESSES NEED CONNECTED SYSTEMS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div className="max-w-2xl">
                <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                  Operational Insights
                </span>
                <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                  Why Hospitality Businesses Need Connected Operational Systems
                </h2>
              </div>
              <Link
                href="/features"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-xs font-bold text-servora-navy hover:bg-servora-pale transition-colors flex-shrink-0"
              >
                Explore Servora Features &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {OPERATIONAL_CHALLENGES.map((item) => (
                <div
                  key={item.challenge}
                  className="rounded-2xl bg-white/5 border border-white/10 p-6"
                >
                  <h3 className="text-base font-bold text-white mb-2">{item.challenge}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{item.solution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: SERVORA PRODUCT EDUCATION --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Product Education
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Learn the Technology Behind Smarter Hospitality Operations
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PRODUCT_EDUCATION_LINKS.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl bg-servora-pale border border-gray-200/80 p-6 hover:border-servora-core hover:bg-white hover:shadow-md transition-all flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="text-base font-bold text-servora-navy group-hover:text-servora-core transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-servora-deepTeal mt-1">{item.desc}</p>
                  </div>
                  <span className="text-servora-core font-bold text-sm flex-shrink-0">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 10: FREQUENTLY ASKED QUESTIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Knowledge Centre FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={RESOURCES_FAQS} />
          </div>
        </section>

        {/* --- SECTION 11: FINAL CONVERSION CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Turn Hospitality Insights Into Better Business Decisions.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Explore how Servora connects your sales, kitchen, inventory, procurement, payments, and reporting operations through one integrated hospitality management platform.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Request a Live Demo &rarr;
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Explore Platform Features
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}