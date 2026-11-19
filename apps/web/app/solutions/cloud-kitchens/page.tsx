// apps/web/app/solutions/cloud-kitchens/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import HeroBackgroundVideo from '@/components/landing/HeroBackgroundVideo';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cloud Kitchen Software Kenya | Multi-Brand POS & KDS | Servora',
  description:
    'Manage virtual food brands, kitchen orders, KDS station routing, recipe-based ingredient stock deduction and delivery workflows with Servora cloud kitchen software by Mavora Technologies.',
  path: '/solutions/cloud-kitchens',
  keywords: [
    'Cloud Kitchen Software Kenya',
    'Cloud Kitchen Management Software Kenya',
    'Dark Kitchen Software Kenya',
    'Ghost Kitchen POS System',
    'Virtual Restaurant Management Software',
    'Multi-Brand Restaurant Management System',
    'Kitchen Display System Kenya',
    'KDS Software for Restaurants',
    'Delivery Kitchen POS System',
    'Food Production Management Software',
    'Recipe Costing Software',
    'Restaurant Inventory Management Software',
    'Automated Ingredient Stock Deduction',
    'Central Kitchen Management System',
    'Online Order Management for Restaurants',
    'Cloud Kitchen POS Nairobi',
    'Multi-Outlet Restaurant Software',
  ],
});

const CLOUD_KITCHEN_CHALLENGES = [
  {
    title: 'Multi-Brand Menu Complexity',
    detail: 'Managing several distinct delivery concepts out of a single kitchen without confusing orders or ticket routing.',
  },
  {
    title: 'High-Volume Order Pipeline',
    detail: 'Aggregating direct online orders, delivery dispatches, and takeaway counter tickets into a unified workflow.',
  },
  {
    title: 'Fragmented Kitchen Prep',
    detail: 'Delays and errors caused by manual paper dockets across grill, fryer, assembly, and packaging stations.',
  },
  {
    title: 'Shared Ingredient Tracking',
    detail: 'Difficulty tracking raw proteins, produce, and packaging shared across multiple virtual food brands.',
  },
  {
    title: 'Uncontrolled Food Costs',
    detail: 'Stock shrinkage and margin erosion when ingredient consumption is not linked to recipe BOMs.',
  },
  {
    title: 'Limited Brand Performance Visibility',
    detail: 'Inability to isolate sales, popular items, and profitability for each virtual concept individually.',
  },
];

const VIRTUAL_BRANDS_HUB = [
  { brand: 'Brand A', concept: 'Gourmet Burgers' },
  { brand: 'Brand B', concept: 'Crispy Chicken Lab' },
  { brand: 'Brand C', concept: 'Healthy Protein Bowls' },
  { brand: 'Brand D', concept: 'Artisan Pizza Studio' },
];

const SHARED_RESOURCES = [
  'Central Ingredient Inventory',
  'Configured Recipe BOMs',
  'Multi-Station KDS Screens',
  'Kitchen Production Staff',
  'Unified Dispatch Queue',
  'Consolidated BI Analytics',
];

const KDS_STATIONS = [
  { station: 'Grill Station', items: 'Beef Patties, Steaks, Warm Proteins' },
  { station: 'Fryer Station', items: 'French Fries, Wings, Crispy Coatings' },
  { station: 'Cold Prep / Assembly', items: 'Salads, Bowls, Wraps, Dressings' },
  { station: 'Packaging & Dispatch', items: 'Box Assembly, Sealing, Bag Tagging' },
];

const BOM_CLOUD_EXAMPLES = [
  { ingredient: 'Chicken Breast', recipeQty: '150 g', unit: 'Grams (g)', usage: 'Deducted from shared chicken stock' },
  { ingredient: 'Burger Bun', recipeQty: '1 unit', unit: 'Pieces', usage: 'Deducted from bakery inventory' },
  { ingredient: 'Lettuce & Tomato', recipeQty: '50 g', unit: 'Grams (g)', usage: 'Deducted from produce stock' },
  { ingredient: 'Signature Sauce', recipeQty: '25 ml', unit: 'Milliliters (ml)', usage: 'Deducted from prep batch stock' },
];

const CLOUD_KITCHEN_TYPES = [
  { name: 'Cloud & Dark Kitchens', detail: 'High-velocity production facilities focused purely on digital delivery and takeaway.' },
  { name: 'Multi-Brand Virtual Restaurants', detail: 'Operators running two or more distinct food concepts from a single kitchen footprint.' },
  { name: 'Central Commissary Kitchens', detail: 'Production hubs supplying semi-prepped ingredients or finished meals to satellite outlets.' },
  { name: 'Delivery-First Restaurants', detail: 'Established dining venues expanding revenue through dedicated online delivery brands.' },
  { name: 'Ghost Kitchen Hubs', detail: 'Shared facilities hosting multiple independent culinary brands under one roof.' },
  { name: 'Restaurant Chains', detail: 'Growing culinary groups scaling new virtual concepts quickly with minimal overhead.' },
];

const CLOUD_KITCHEN_FAQS = [
  {
    question: 'How does Servora support cloud kitchens and multi-brand dark kitchens?',
    answer:
      'Servora consolidates direct online orders, takeaway counter tickets, and delivery dispatches into a unified Kitchen Display System (KDS). Items are automatically routed to dedicated prep stations (Grill, Fryer, Cold Pantry, Packaging) while deducting shared ingredients from a single central inventory.',
  },
  {
    question: 'Can cloud kitchens manage multiple virtual food brands from one kitchen?',
    answer:
      'Yes. Servora allows operators to configure distinct menus and pricing for multiple virtual concepts while routing all orders into a shared kitchen workflow and unified inventory ledger.',
  },
  {
    question: 'Can different virtual brands share the same ingredient inventory?',
    answer:
      'Yes. When multiple brands use common ingredients (such as chicken, cooking oil, or packaging), Servora tracks them in a central inventory and deducts quantities based on each product\'s configured recipe BOM.',
  },
  {
    question: 'Does Servora automatically deduct ingredients when a menu item is sold?',
    answer:
      'Yes. Once menu items are mapped to Bill of Materials (BOM) recipes with precise quantities and units, every completed order automatically depletes the configured ingredients from the active stockroom.',
  },
  {
    question: 'Can Servora route orders to different kitchen preparation stations?',
    answer:
      'Yes. Servora\'s multi-station KDS routing automatically sends food items to their designated preparation points—such as Grill, Fryer, Cold Prep, and Packaging—eliminating paper ticket confusion.',
  },
  {
    question: 'Can managers track food costs and recipe margins in cloud kitchens?',
    answer:
      'Yes. By linking menu recipes to ingredient costs, managers can analyze gross contribution margins, ingredient consumption, and theoretical vs. actual usage across each virtual brand.',
  },
  {
    question: 'Does Servora support M-Pesa payments for takeaway and direct orders?',
    answer:
      'Yes. Staff can trigger Safaricom M-Pesa Daraja STK Push requests directly from the POS register or reconcile C2B Till callbacks automatically.',
  },
  {
    question: 'How can I request a cloud kitchen demonstration?',
    answer:
      'Click "Request a Cloud Kitchen Demo" anywhere on this page to connect with our Nairobi team on the Contact page, or call Mavora Technologies Ltd directly.',
  },
];

export default function CloudKitchensSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Cloud Kitchens', path: '/solutions/cloud-kitchens' },
          ]),
          buildFaqSchema(CLOUD_KITCHEN_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM HERO WITH BACKGROUND VIDEO --- */}
        <section className="relative isolate overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 w-full px-4 sm:px-8 lg:px-16">
          <HeroBackgroundVideo
            videoId="DxYJMFoz7qU"
            title="Meet Servora POS – Cloud Kitchen & KDS Background Video"
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link href="/" className="hover:text-servora-core font-semibold">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-bold text-servora-navy">Cloud Kitchens</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-xs px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Cloud Kitchen &amp; Dark Kitchen Software
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Cloud Kitchen Software for Multi-Brand Operations and{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Smarter Kitchen Production.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal font-medium">
                Run multiple food concepts from one production kitchen. Connect orders, kitchen preparation, recipe-based stock control, and fulfillment workflows through one integrated hospitality management platform.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Request a Cloud Kitchen Demo &rarr;
                </Link>
                <Link
                  href="/features"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white/95 backdrop-blur-xs px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Explore Platform Features
                </Link>
              </div>
            </div>

            {/* Hero Visual: Servora Overview Dashboard */}
            <div className="lg:col-span-6 w-full">
              <div className="rounded-3xl bg-servora-navy/95 backdrop-blur-md p-2.5 sm:p-3 shadow-2xl ring-1 ring-white/15 overflow-hidden">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/servora-dashboard-overview.png"
                    alt="Servora Overview Dashboard showing gross turnover, sales by channel, order status, and kitchen station performance for cloud kitchen operations"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Overview Dashboard &bull; Gross Turnover &bull; Sales by Channel &bull; Kitchen Performance
                  </span>
                  <span className="font-mono text-servora-teal">Servora OS 2.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: THE CLOUD KITCHEN CHALLENGE --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Cloud Kitchen Realities
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                One Kitchen Can Run Multiple Brands. But Operations Must Stay Connected.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                Dark kitchens and delivery hubs scale fast by launching virtual restaurant concepts. Servora helps operators overcome common production hurdles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {CLOUD_KITCHEN_CHALLENGES.map((item, idx) => (
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

        {/* --- SECTION 3: MULTI-BRAND VIRTUAL KITCHEN ARCHITECTURE (PRIORITY) --- */}
        <section className="py-16 sm:py-20 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                Virtual Kitchen Architecture
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                Operate Multiple Virtual Food Brands From One Production Hub.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300">
                Distinct customer-facing menus and brands feed into shared production stations and central ingredient inventory.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Virtual Brands */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-servora-teal font-bold">
                  Virtual Customer Brands
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VIRTUAL_BRANDS_HUB.map((vb) => (
                    <div
                      key={vb.brand}
                      className="rounded-2xl bg-white/5 border border-white/10 p-4"
                    >
                      <span className="text-[10px] font-mono text-servora-teal font-bold">
                        {vb.brand}
                      </span>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">{vb.concept}</h3>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle Arrow */}
              <div className="lg:col-span-2 flex justify-center py-2 lg:py-0">
                <div className="rounded-full bg-servora-teal/20 border border-servora-teal/40 px-4 py-2 text-xs font-bold text-servora-teal font-mono">
                  &rarr; Feeds Into &rarr;
                </div>
              </div>

              {/* Right: Shared Operational Resources */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-servora-teal font-bold">
                  Shared Production Hub
                </span>
                <div className="rounded-2xl bg-white/10 border border-white/15 p-5 space-y-2.5">
                  {SHARED_RESOURCES.map((res) => (
                    <div key={res} className="flex items-center gap-2.5 text-xs font-bold text-white">
                      <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                      <span>{res}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: KITCHEN DISPLAY SYSTEM (KDS) & STATIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Kitchen Display System (KDS)
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                Keep Every Preparation Station in Sync.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Replace paper dockets with digital screens that automatically route items by prep station. Whether an order comes from Brand A or Brand B, the grill, fryer, and cold prep stations receive only their assigned items simultaneously.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-3xl bg-servora-pale border border-gray-200/90 p-6 sm:p-8 shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-servora-core font-bold">
                Multi-Station KDS Routing
              </span>
              <h3 className="text-base font-extrabold text-servora-navy mt-1 mb-4">
                Automated Ticket Splitting Across Production Lines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {KDS_STATIONS.map((st) => (
                  <div
                    key={st.station}
                    className="rounded-2xl bg-white border border-gray-200/80 p-4 shadow-2xs"
                  >
                    <span className="text-xs font-bold text-servora-navy font-mono">
                      {st.station}
                    </span>
                    <p className="text-xs text-servora-deepTeal mt-1.5">{st.items}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 7: RECIPE BOM & INGREDIENT DEDUCTION (PRIORITY) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-12">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                  Recipe BOM Costing
                </span>
                <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                  Every Order Should Account for the Ingredients It Consumes.
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Servora connects sold menu items from any virtual brand to configured Bills of Materials (BOM) recipes. When a customer orders a chicken burger from Brand B, the system automatically deducts 150g of chicken, 1 bun, lettuce, and sauce from the shared production inventory.
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-md bg-servora-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/recipe-bom-workflow.png"
                    alt="Servora POS terminal demonstrating automatic recipe BOM stock deduction for Chicken Burger Brand B with real-time inventory updates"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* BOM Table */}
            <div className="rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-servora-core font-bold">
                Illustrative BOM Example
              </span>
              <h3 className="text-lg font-extrabold text-servora-navy mt-1 mb-4">
                Shared Kitchen Ingredient Depletion
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-servora-deepTeal uppercase text-[10px] tracking-wider">
                      <th className="py-3 pr-4">Ingredient</th>
                      <th className="py-3 px-4">Recipe Quantity</th>
                      <th className="py-3 px-4">Unit of Measure</th>
                      <th className="py-3 pl-4">Stock Behavior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/70">
                    {BOM_CLOUD_EXAMPLES.map((ex) => (
                      <tr key={ex.ingredient}>
                        <td className="py-3.5 pr-4 font-bold text-servora-navy">{ex.ingredient}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-servora-core">{ex.recipeQty}</td>
                        <td className="py-3.5 px-4 text-servora-deepTeal">{ex.unit}</td>
                        <td className="py-3.5 pl-4 text-servora-deepTeal">{ex.usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTIONS 11 & 14: TAKAWAY, DELIVERY & PAYMENTS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-3xl bg-servora-pale border border-gray-200/90 p-7 sm:p-9">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Fulfillment Handoff
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Support Takeaway Counter &amp; Delivery Dispatch.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Coordinate counter collection and delivery rider handoffs with structured order tickets, packaging charge rules, and dispatch status updates.
              </p>
            </div>

            <div className="rounded-3xl bg-servora-pale border border-gray-200/90 p-7 sm:p-9">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Payment Control
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Keep Order Payments and Sales Records Connected.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Accept M-Pesa STK Push requests, cash, and card payments while reconciling order totals against cashier shift registers automatically.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 16: WHO SHOULD USE SERVORA CLOUD KITCHEN SOLUTIONS? --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Production Formats
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Designed for Modern Food Production Businesses
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CLOUD_KITCHEN_TYPES.map((type) => (
                <div
                  key={type.name}
                  className="rounded-2xl bg-white border border-gray-200/80 p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{type.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">{type.detail}</p>
                  </div>
                  <Link
                    href="/contact"
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    Request Kitchen Demo &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 19: CLOUD KITCHEN FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Cloud Kitchen FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Cloud Kitchen &amp; KDS Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={CLOUD_KITCHEN_FAQS} />
          </div>
        </section>

        {/* --- SECTION 20: FINAL CONVERSION SECTION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              One Kitchen. Multiple Brands. Smarter Operations.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Bring your menus, kitchen production, ingredient inventory, and order workflows together with Servora. Discover a more organized way to manage and grow your cloud kitchen business.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Request a Cloud Kitchen Demo &rarr;
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Explore Servora Features
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}