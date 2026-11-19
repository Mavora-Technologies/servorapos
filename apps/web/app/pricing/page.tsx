// apps/web/app/pricing/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import PricingPlansClient from '../../components/marketing/PricingPlansClient';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';
import { PRICING_PLANS, PRICING_FAQS } from '@/lib/pricing/plans';

export const metadata: Metadata = buildPageMetadata({
  title: 'Servora Pricing Kenya | Restaurant POS & Hospitality Software Plans',
  description:
    'Explore Servora restaurant and hospitality software pricing in Kenya. Compare Starter, Business, Professional, and Enterprise plans from KSh 2,500/month, with flexible monthly, six-month, and annual billing.',
  path: '/pricing',
  keywords: [
    'Restaurant POS pricing Kenya',
    'Restaurant management software pricing Kenya',
    'Hospitality software pricing Kenya',
    'Hotel management software pricing Kenya',
    'POS system cost Kenya',
    'Restaurant POS subscription',
    'Cloud-based restaurant POS Kenya',
    'Hotel and restaurant POS software Nairobi',
    'Kitchen Display System pricing',
    'Inventory management software for restaurants',
    'Servora pricing plans',
    'Restaurant software monthly subscription',
  ],
});

const ILLUSTRATIVE_BOM_ROWS = [
  { ingredient: 'Chicken', quantity: '250 g' },
  { ingredient: 'Rice', quantity: '150 g' },
  { ingredient: 'Cooking oil', quantity: '20 ml' },
  { ingredient: 'Vegetables', quantity: '100 g' },
  { ingredient: 'Sauce', quantity: '30 ml' },
];

const GROWTH_STAGES = [
  {
    name: 'Independent Cafés & Bakeries',
    guidance:
      'Start with essential POS, modifiers, and daily sales reporting—or step up to Professional if recipe-level ingredient costing is a priority from day one.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Full-Service & Casual Restaurants',
    guidance:
      'Combine visual table service, Kitchen Display System (KDS) routing, and M-Pesa Daraja payments on Business or Professional.',
    href: '/solutions/restaurants',
  },
  {
    name: 'Bars & Lounges',
    guidance:
      'Pair fast open-tab checkout with milliliter recipe BOMs and blind shift accountability on Professional.',
    href: '/solutions/bars-lounges',
  },
  {
    name: 'Hotels, Resorts & Cloud Kitchens',
    guidance:
      'Coordinate multiple outlets, central store stock transfers, and consolidated executive reporting on Enterprise.',
    href: '/solutions/hotels',
  },
];

const TRANSPARENCY_POINTS = [
  {
    title: 'Clear KES Pricing',
    detail: 'All subscription tiers are published in Kenyan Shillings (KES) for local budgeting clarity.',
  },
  {
    title: 'Flexible Billing Intervals',
    detail: 'Choose Monthly (1x), Every 6 Months (5x — 1 month free), or Annually (10x — 2 months free).',
  },
  {
    title: 'Hardware Quoted Separately',
    detail: 'Software plans cover the cloud platform; POS terminals, printers, and drawers are procured separately.',
  },
  {
    title: 'Guided Plan Selection',
    detail: 'Choose based on your operational workflow needs—our Kilimani team can help size your setup.',
  },
];

export default function PricingPage() {
  const offersSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_CONFIG.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web-based, Cloud',
    url: `${SITE_CONFIG.url}/pricing`,
    offers: PRICING_PLANS.map((plan) => ({
      '@type': 'Offer',
      name: `${plan.name} Plan`,
      price: String(plan.monthlyPrice),
      priceCurrency: 'KES',
    })),
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
          offersSchema,
          buildFaqSchema(PRICING_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: COMPACT PRICING HERO --- */}
        <section className="relative overflow-hidden pt-8 pb-8 sm:pt-12 sm:pb-10 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/40 to-servora-pale border-b border-gray-200/60">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">Pricing Plans</li>
              </ol>
            </nav>

            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
              Transparent Servora Subscriptions &bull; KES
            </span>

            <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.25rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
              Powerful Hospitality Management.{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Pricing That Grows With You.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
              From independent cafés to established restaurant groups, Servora gives you the operational tools to manage sales, kitchen workflows, inventory, payments, and business performance — with monthly, six-month, and annual billing in Kenyan Shillings.
            </p>
          </div>
        </section>

        {/* --- SECTIONS 2 & 3: INTERACTIVE BILLING SELECTOR, PLANS & COMPARISON --- */}
        <PricingPlansClient />

        {/* --- SECTION 4: VALUE BEHIND SERVORA PRICING (WITH RECIPE BOM EXAMPLE) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Connected Hospitality Value
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                More Than a POS. One Connected Hospitality Platform.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Servora unites front-of-house ordering, table service, Kitchen Display Systems, purchasing, M-Pesa payments, and executive analytics. On Professional and Enterprise plans, configured menu recipes connect every POS sale directly to ingredient-level stock deduction.
              </p>
              <div className="mt-6 flex flex-wrap gap-5 text-xs font-bold">
                <Link href="/features" className="text-servora-core hover:underline">
                  Explore All Platform Features &rarr;
                </Link>
                <Link href="/solutions/cloud-kitchens" className="text-servora-core hover:underline">
                  See Cloud Kitchen &amp; KDS Workflows &rarr;
                </Link>
              </div>
            </div>

            {/* Illustrative BOM Card */}
            <div className="lg:col-span-6 rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-gray-100 mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-servora-core font-bold">
                    Illustrative Recipe BOM Deduction
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mt-0.5">
                    Sold Item: Grilled Chicken Platter (1 Portion)
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold">
                  Auto-Deducted
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {ILLUSTRATIVE_BOM_ROWS.map((row) => (
                  <div
                    key={row.ingredient}
                    className="flex items-center justify-between rounded-xl bg-servora-pale/70 px-4 py-2.5"
                  >
                    <span className="font-bold text-servora-navy">{row.ingredient}</span>
                    <span className="font-mono font-bold text-servora-core">- {row.quantity}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11px] text-servora-deepTeal/85">
                Stock deduction depends on properly configured menu-to-recipe BOM mappings and units of measurement.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: HARDWARE & IMPLEMENTATION --- */}
        <section className="py-16 sm:py-20 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                Optional Turnkey Hardware
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Need the Complete POS Setup? We&apos;ve Got You Covered.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                Complement your Servora software subscription with touchscreen POS terminals, 80mm thermal receipt printers, RJ11 cash drawers, Kitchen Display System screens, and barcode scanners—sourced, configured, and installed by {SITE_CONFIG.parentCompany.name}.
              </p>
            </div>
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-3">
              <Link
                href="/hardware-pos"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-6 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Explore POS Hardware &rarr;
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition-colors"
              >
                Request a Complete Setup
              </Link>
            </div>
          </div>
        </section>

        {/* --- SECTION 6: BUILT FOR EVERY STAGE OF HOSPITALITY GROWTH --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Plan Guidance
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Built for Every Stage of Hospitality Growth.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal">
                Select your subscription based on the operational workflows your team needs—not just your outlet count.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {GROWTH_STAGES.map((stage) => (
                <div
                  key={stage.name}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{stage.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">{stage.guidance}</p>
                  </div>
                  <Link
                    href={stage.href}
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    View Solution &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: PRICING TRANSPARENCY & TRUST --- */}
        <section className="py-14 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
                Straightforward Pricing. Clear Business Value.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRANSPARENCY_POINTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-white border border-gray-200/80 p-5 shadow-2xs"
                >
                  <h3 className="text-sm font-extrabold text-servora-navy mb-1.5">{item.title}</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: PRICING FAQ --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Pricing FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Frequently Asked Pricing Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={PRICING_FAQS} />
          </div>
        </section>

        {/* --- SECTION 9: FINAL CONVERSION CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Ready to Run a Smarter Hospitality Business?
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Choose the Servora plan that fits your operations and take control of your sales, service, inventory, and business performance.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <a
                href="#plans"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Explore Servora Plans
              </a>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Talk to Our Team &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}