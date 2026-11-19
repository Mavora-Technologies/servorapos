// apps/web/app/solutions/bars-lounges/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Bar & Lounge POS Software Kenya | Tabs, Pour Control & Stock | Servora',
  description:
    'Manage bar tabs, beverage sales, cocktail recipes, ingredient stock deduction, M-Pesa payments, and cashier shifts with Servora bar and lounge POS software by Mavora Technologies.',
  path: '/solutions/bars-lounges',
  keywords: [
    'Bar and Lounge POS Software Kenya',
    'Bar POS System Kenya',
    'Bar Management Software Kenya',
    'Bar Tab Management Software',
    'Lounge POS Software Nairobi',
    'Nightclub POS System Kenya',
    'Beverage Inventory Management Software',
    'Pour Cost Tracking Software',
    'Spirit Inventory Management System',
    'Bar Stock Control Software',
    'Cocktail Recipe Costing Software',
    'M-Pesa POS for Bars',
    'Hotel Bar POS Software',
    'Beverage Stock Management System',
    'Bar Cashier Management System',
  ],
});

const BAR_CHALLENGES = [
  {
    title: 'Slow Counter Service',
    detail: 'Peak-hour queues and confusion when manual dockets or fragmented tills slow down round ordering.',
  },
  {
    title: 'Untracked Open Tabs',
    detail: 'Lost revenue and disputes when guest tabs are managed on paper or scattered across unlinked slips.',
  },
  {
    title: 'Beverage Stock Discrepancies',
    detail: 'Unexplained shrinkage between store bottle transfers and actual drinks sold across the counter.',
  },
  {
    title: 'Unmeasured Spirit Pours',
    detail: 'Over-pouring and unrecorded complimentary drinks that quietly erode gross margins.',
  },
  {
    title: 'Cashier Reconciliation Friction',
    detail: 'End-of-night drawer discrepancies and difficulty auditing shift handovers across bartenders.',
  },
  {
    title: 'Limited Profit Visibility',
    detail: 'Inability to track real-time beverage sales, high-margin cocktails, and pour-cost variances.',
  },
];

const BAR_WORKFLOW = [
  { step: '01', title: 'Open Tab', detail: 'Guest opens a named or table-linked tab.' },
  { step: '02', title: 'Add Rounds', detail: 'Bartender adds drinks & cocktails instantly.' },
  { step: '03', title: 'Bar Routing', detail: 'Tickets route directly to the Bar KDS screen.' },
  { step: '04', title: 'Pour & Serve', detail: 'Drinks prepared according to recipe BOMs.' },
  { step: '05', title: 'Stock Deduction', detail: 'Exact milliliters or units depleted from stock.' },
  { step: '06', title: 'Fast Settlement', detail: 'Paid via M-Pesa STK Push, card, or cash.' },
  { step: '07', title: 'Shift Audit', detail: 'Sales & drawer cash reconciled to blind count.' },
];

const BOM_BAR_EXAMPLES = [
  { item: 'Signature Mojito', recipe: 'White Rum (50ml), Lime (20ml), Syrup (15ml), Soda (100ml)', tracking: 'Automated ml deduction' },
  { item: 'Premium Gin & Tonic', recipe: 'Gin (60ml), Tonic Water (200ml), Botanicals', tracking: 'Automated ml deduction' },
  { item: 'Cold Draft Beer', recipe: 'Draft Beer Keg (Pint Pour)', tracking: 'Automated volume deduction' },
  { item: 'Bottled Imported Beer', recipe: 'Individual Unit SKU', tracking: 'Unit-based bottle deduction' },
];

const BAR_BUSINESS_TYPES = [
  { name: 'Cocktail & Wine Lounges', detail: 'Open tabs, measured spirit recipes, and sophisticated beverage lists.' },
  { name: 'Nightclubs & Entertainment Venues', detail: 'High-throughput counter sales, rapid bottle service, and strict till accountability.' },
  { name: 'Hotel Lobby & Rooftop Bars', detail: 'Connected multi-outlet beverage operations and central store transfers.' },
  { name: 'Sports Bars & Pubs', detail: 'Fast round ordering, group tab splits, and kitchen food-service coordination.' },
  { name: 'Beach Resorts & Poolside Bars', detail: 'Outdoor mobile POS checkout and quick guest tab settlement.' },
  { name: 'Restaurants with Dedicated Bars', detail: 'Unified dining and beverage service with cross-departmental stock control.' },
];

const BARS_FAQS = [
  {
    question: 'How does Servora help bars and lounges prevent beverage shrinkage and spillage?',
    answer:
      'Servora links cocktails and measured pours to Bill of Materials (BOM) recipes in milliliters while tracking bottled drinks in units. Every drink rung up deducts exact stock automatically, allowing managers to run blind shift counts and audit theoretical vs. actual pour variance[cite: 9].',
  },
  {
    question: 'Can bartenders manage multiple open tabs and settle quickly with M-Pesa?',
    answer:
      'Yes. Staff can open named or table-linked bar tabs, route drink tickets directly to a dedicated Bar KDS screen, split bills across guests, and verify Safaricom M-Pesa STK Push or Till payments instantly at the counter[cite: 10].',
  },
  {
    question: 'Can Servora track spirits by milliliters and bottled beers by units?',
    answer:
      'Yes. Servora supports dual inventory tracking—allowing spirits, wines, and cocktail mixers to be formulated in milliliters (ml) or liters (L), while beers, water, and ready-to-drink cans are tracked as discrete unit SKUs.',
  },
  {
    question: 'Can bar orders be routed to a preparation display screen?',
    answer:
      'Yes. Servora routes digital drink tickets directly to a dedicated Bar Kitchen Display System (KDS) screen, eliminating paper slip clutter and keeping bartenders aligned with servers.',
  },
  {
    question: 'How do cashier shift reconciliations work for bars?',
    answer:
      'Servora supports cashier shift opening and closing, payment-method summaries, and blind till reconciliations where staff independently declare cash counted before comparing against expected system totals.',
  },
  {
    question: 'Does Servora support M-Pesa payments for busy bar counters?',
    answer:
      'Yes. Staff can trigger Safaricom M-Pesa Daraja STK Push prompts directly to the customer’s phone or reconcile C2B Till callbacks automatically at checkout[cite: 10].',
  },
  {
    question: 'Can a business manage more than one bar outlet?',
    answer:
      'Yes. Multi-outlet management allows hospitality groups to operate distinct menus, pricing, and cashier drawers for the main lounge, rooftop bar, and poolside station from a single account.',
  },
  {
    question: 'How can I request a bar POS demonstration?',
    answer:
      'Click "Book a Bar POS Demo" anywhere on this page to connect with our Nairobi team on the Contact page, or call Mavora Technologies Ltd directly.',
  },
];

export default function BarsLoungesSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Bars & Lounges', path: '/solutions/bars-lounges' },
          ]),
          buildFaqSchema(BARS_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM HERO --- */}
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/60 to-servora-pale border-b border-gray-200/60">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link href="/" className="hover:text-servora-core font-semibold">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-bold text-servora-navy">Bars &amp; Lounges</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Bar &amp; Lounge Management Solution
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Bar &amp; Lounge POS Software for{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Faster Service &amp; Smarter Beverage Control.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Keep every round moving and every pour accountable. Manage guest tabs, drink orders, beverage inventory, M-Pesa payments, and cashier shifts from one connected bar management platform.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Book a Bar POS Demo &rarr;
                </Link>
                <Link
                  href="/features"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Explore Platform Features
                </Link>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="lg:col-span-6 w-full">
              <div className="rounded-3xl bg-servora-navy p-2.5 sm:p-3 shadow-2xl ring-1 ring-white/15 overflow-hidden">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/bars-lounges.png"
                    alt="Bartender managing bar tabs and M-Pesa checkout on a high-speed Servora POS terminal"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Open Tabs &bull; Bar KDS &bull; Pour-Cost BOM &bull; M-Pesa
                  </span>
                  <span className="font-mono text-servora-teal">Servora POS 2.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: OPERATIONAL CHALLENGES --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Bar Realities
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Running a Busy Bar Shouldn&apos;t Mean Losing Control.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-servora-deepTeal">
                High-volume lounges and hotel bars face constant pressure during peak hours. Servora helps bar managers eliminate common operational bottlenecks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {BAR_CHALLENGES.map((item, idx) => (
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

        {/* --- SECTION 3: THE CONNECTED BAR OPERATIONS WORKFLOW --- */}
        <section className="py-16 sm:py-20 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                Connected Beverage Lifecycle
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                One Connected System. Every Round Accounted For.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300">
                From opening a tab to dispensing drinks and closing the shift, every transaction updates stock and revenue records in real time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
              {BAR_WORKFLOW.map((item, idx) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2 py-0.5 rounded">
                        {item.step}
                      </span>
                      {idx < BAR_WORKFLOW.length - 1 && (
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

        {/* --- SECTION 4: OPEN BAR TABS & GUEST MANAGEMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Tab Management
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                Keep Every Guest Tab Organized, From the First Round to Checkout.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Open named or table-linked bar tabs in seconds. Bartenders can add subsequent rounds without closing checks, review running balances, and settle bills cleanly when guests are ready to leave.
              </p>
            </div>

            {/* Illustrative Bar Tab */}
            <div className="lg:col-span-7 rounded-3xl bg-servora-pale border border-gray-200/90 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                    Illustrative Guest Tab
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mt-0.5">
                    VIP Booth 02 &bull; Tab #104 (Named: Alex M.)
                  </h3>
                </div>
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 text-[11px] font-bold">
                  Open Tab &bull; 3 Rounds
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-white border border-gray-100">
                  <span className="font-bold text-servora-navy">2x Premium Gin &amp; Tonic (Round 1)</span>
                  <span className="text-servora-deepTeal font-mono font-semibold">KSh 1,800</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-white border border-gray-100">
                  <span className="font-bold text-servora-navy">1x Signature Cocktail Platter (Round 2)</span>
                  <span className="text-servora-deepTeal font-mono font-semibold">KSh 2,500</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-white border border-gray-100">
                  <span className="font-bold text-servora-navy">4x Bottled Water &amp; Mixers (Round 3)</span>
                  <span className="text-servora-deepTeal font-mono font-semibold">KSh 1,000</span>
                </div>
                <div className="flex justify-between p-3.5 rounded-xl bg-servora-navy text-white font-bold mt-2">
                  <span>Running Tab Total</span>
                  <span className="font-mono text-servora-teal text-sm">KSh 5,300</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: BAR ORDER ROUTING & PREPARATION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <span className="text-xs font-extrabold text-servora-navy uppercase tracking-wider">
                  Bar Preparation Queue (KDS)
                </span>
                <span className="text-[10px] font-mono text-servora-teal bg-servora-teal/10 px-2.5 py-1 rounded-full">
                  Live Station View
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  { ticket: '#1042', drinks: '2x Mojitos, 1x Fresh Juice', status: 'Preparing' },
                  { ticket: '#1043', drinks: '3x Bottled Beers', status: 'New Order' },
                  { ticket: '#1044', drinks: '1x Gin & Tonic', status: 'Ready to Serve' },
                ].map((t) => (
                  <div
                    key={t.ticket}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-servora-pale/70 border border-gray-100"
                  >
                    <div>
                      <span className="font-bold text-servora-navy font-mono">{t.ticket}</span>
                      <p className="text-[11px] text-servora-deepTeal mt-0.5">{t.drinks}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-servora-core">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Bar Order Routing
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                From Order Entry to Drink Preparation Without the Paperwork.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Route beverage tickets directly to a dedicated Bar Kitchen Display System (KDS) screen or printer. Eliminate lost paper dockets, speed up drink assembly, and keep bartenders and servers perfectly synchronized during high-energy rushes.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 6: BEVERAGE INVENTORY & POUR CONTROL (PRIORITY) --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-12">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                  Pour-Cost BOM Control
                </span>
                <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                  Know What Was Sold, What Was Poured, and What Remains in Stock.
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Servora connects beverage sales directly to inventory through configured recipes and Bills of Materials (BOMs). Spirits and cocktail mixers are formulated in milliliters (ml) or liters (L), while bottled beers and soft drinks are tracked as discrete unit SKUs[cite: 9]. Every drink sold automatically depletes exact stock quantities.
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-md bg-servora-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/bar-pour-control.png"
                    alt="Bartender crafting a cocktail beside a Servora Bar POS and KDS terminal displaying active drink orders and pour inventory"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* BOM Bar Table */}
            <div className="rounded-3xl bg-servora-pale border border-gray-200/90 p-6 sm:p-8 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-servora-core font-bold">
                Dual Inventory Tracking Model
              </span>
              <h3 className="text-lg font-extrabold text-servora-navy mt-1 mb-4">
                Milliliter Recipes vs. Unit SKUs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-servora-deepTeal uppercase text-[10px] tracking-wider">
                      <th className="py-3 pr-4">Beverage Item</th>
                      <th className="py-3 px-4">Recipe Formulation / Unit</th>
                      <th className="py-3 pl-4">Inventory Deduction Behavior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/70">
                    {BOM_BAR_EXAMPLES.map((ex) => (
                      <tr key={ex.item}>
                        <td className="py-3.5 pr-4 font-bold text-servora-navy">{ex.item}</td>
                        <td className="py-3.5 px-4 font-mono text-servora-core">{ex.recipe}</td>
                        <td className="py-3.5 pl-4 text-servora-deepTeal">{ex.tracking}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTIONS 7 & 8: STOCK TRANSFERS & CASHIER SHIFTS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Store Transfers */}
            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs">
              <span className="text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Stockroom Logistics
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Keep Your Bar Stock Moving With Clear Accountability.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Transfer stock from the central store or main warehouse to bar sub-stores with structured requisitions and receiving confirmations. Maintain complete visibility over stock movement and reduce shrinkage.
              </p>
            </div>

            {/* Cashier Shift Custody */}
            <div className="rounded-3xl bg-servora-navy text-white p-7 sm:p-9 shadow-lg">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Financial Accountability
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-white">
                Know Who Handled the Shift. Know What Was Collected.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
                Enforce cashier shift opening and closing, payment-method summaries, and blind till reconciliations where bartenders and cashiers independently declare cash counted before closing out.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTIONS 9, 10 & 11: M-PESA, PROMOTIONS & COSTING --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-servora-pale border border-gray-200/80 p-7">
              <span className="text-[10px] font-bold uppercase tracking-wider text-servora-teal">
                Payments
              </span>
              <h3 className="text-base font-extrabold text-servora-navy mt-1.5 mb-2">
                M-Pesa STK Push at Counter
              </h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">
                Trigger instant Safaricom M-Pesa Daraja STK Push payment requests directly from the bar register and reconcile till callbacks automatically[cite: 10].
              </p>
            </div>

            <div className="rounded-2xl bg-servora-pale border border-gray-200/80 p-7">
              <span className="text-[10px] font-bold uppercase tracking-wider text-servora-teal">
                Promotions
              </span>
              <h3 className="text-base font-extrabold text-servora-navy mt-1.5 mb-2">
                Promotional Discounts &amp; Caps
              </h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">
                Run promotional discount codes with manager approval limits, enforce drawer cash caps, and track complimentary items without losing margin visibility.
              </p>
            </div>

            <div className="rounded-2xl bg-servora-pale border border-gray-200/80 p-7">
              <span className="text-[10px] font-bold uppercase tracking-wider text-servora-teal">
                Profitability
              </span>
              <h3 className="text-base font-extrabold text-servora-navy mt-1.5 mb-2">
                Beverage Cost &amp; Gross Contribution
              </h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">
                Analyze product-level costs against selling prices to identify high-margin cocktails, top-selling spirits, and profitable beverage categories.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 13: BUILT FOR DIFFERENT BAR AND LOUNGE BUSINESSES --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Bar Formats
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                One Platform for Different Beverage Businesses
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {BAR_BUSINESS_TYPES.map((biz) => (
                <div
                  key={biz.name}
                  className="rounded-2xl bg-white border border-gray-200/80 p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{biz.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">{biz.detail}</p>
                  </div>
                  <Link
                    href="/contact"
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    Request Bar Demo &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 17: BAR FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Bar POS FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Bar &amp; Lounge POS Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={BARS_FAQS} />
          </div>
        </section>

        {/* --- SECTION 18: FINAL CONVERSION CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Serve Faster. Control Every Pour. Grow Your Bar Smarter.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              See how Servora connects bar sales, guest tabs, beverage inventory, payments, and cashier accountability in one hospitality management platform.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Book a Bar POS Demo &rarr;
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