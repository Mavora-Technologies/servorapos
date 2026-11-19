// apps/web/app/solutions/restaurants/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Restaurant Management Software Kenya | POS, KDS & Inventory | Servora',
  description:
    'Manage restaurant tables, orders, kitchen operations, M-Pesa payments, recipe costing, and ingredient inventory with Servora restaurant management software by Mavora Technologies.',
  path: '/solutions/restaurants',
  keywords: [
    'Restaurant Management Software Kenya',
    'Restaurant POS System Kenya',
    'Restaurant POS Software Nairobi',
    'Café Management Software Kenya',
    'Restaurant Table Management System',
    'Restaurant Kitchen Display System',
    'Restaurant Inventory Management Software',
    'Restaurant Recipe Costing Software',
    'Restaurant Ingredient Tracking System',
    'POS with M-Pesa Integration',
    'Restaurant Billing and Split Payment System',
    'Hotel Restaurant POS System',
    'Coffee Shop POS Software',
  ],
});

const OPERATIONS_WORKFLOW = [
  { step: '01', title: 'Guest Seating', detail: 'Host seats guests on the live floor plan.' },
  { step: '02', title: 'Order Capture', detail: 'Waiter enters items, modifiers & courses.' },
  { step: '03', title: 'Station Routing', detail: 'Tickets split to Grill, Bar & Pantry.' },
  { step: '04', title: 'Kitchen Prep', detail: 'Chefs track SLA timers & bump ready.' },
  { step: '05', title: 'Split & Checkout', detail: 'Guests pay via M-Pesa, card, or cash.' },
  { step: '06', title: 'BOM Deduction', detail: 'Configured recipe ingredients deducted.' },
  { step: '07', title: 'Live Reporting', detail: 'Sales, margins & shift ledgers updated.' },
];

const ILLUSTRATIVE_TABLES = [
  { code: 'T-01', area: 'Main Dining', status: 'Occupied', color: 'bg-servora-core/15 text-servora-core border-servora-core/30', meta: '4 Guests • 32m' },
  { code: 'T-02', area: 'Main Dining', status: 'Vacant', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', meta: 'Ready to Seat' },
  { code: 'T-03', area: 'Main Dining', status: 'Reserved', color: 'bg-amber-50 text-amber-700 border-amber-200', meta: '19:30 • Party of 6' },
  { code: 'T-04', area: 'Terrace', status: 'Occupied', color: 'bg-servora-core/15 text-servora-core border-servora-core/30', meta: '2 Guests • 18m' },
  { code: 'T-05', area: 'Terrace', status: 'Cleaning', color: 'bg-gray-100 text-gray-600 border-gray-200', meta: 'Turnover in progress' },
  { code: 'T-06', area: 'VIP Lounge', status: 'Occupied', color: 'bg-servora-core/15 text-servora-core border-servora-core/30', meta: '5 Guests • Bill Requested' },
];

const BOM_EXAMPLE_ROWS = [
  { ingredient: 'Chicken Breast', quantity: '250 g', unit: 'Grams (g)', note: 'Converted from kg stock' },
  { ingredient: 'Steamed Rice', quantity: '150 g', unit: 'Grams (g)', note: 'Standardized portion' },
  { ingredient: 'Cooking Oil', quantity: '20 ml', unit: 'Milliliters (ml)', note: 'Converted from L stock' },
  { ingredient: 'Seasonal Vegetables', quantity: '100 g', unit: 'Grams (g)', note: 'Includes prep yield' },
  { ingredient: 'Signature Sauce', quantity: '30 ml', unit: 'Milliliters (ml)', note: 'Deducted from prep batch' },
];

const RESTAURANT_MODELS = [
  {
    name: 'Fine Dining Restaurants',
    badge: 'Structured Service',
    description:
      'Coordinate reservations, course firing, detailed modifiers, table-side service, and synchronized kitchen pass execution.',
    href: '/contact',
  },
  {
    name: 'Casual Dining Restaurants',
    badge: 'High-Turnover Floor',
    description:
      'Manage indoor and terrace seating, split group bills, waiter assignments, and high-volume kitchen display queues.',
    href: '/features',
  },
  {
    name: 'Cafés & Coffee Shops',
    badge: 'Custom Drinks & Speed',
    description:
      'Handle rapid counter ordering, milk and syrup modifiers, bakery combos, and gram-level ingredient tracking.',
    href: '/features',
  },
  {
    name: 'Fast-Food Outlets',
    badge: 'Quick Service (QSR)',
    description:
      'Accelerate counter checkout with combo bundles, instant kitchen assembly routing, and packaging stock control.',
    href: '/solutions/cloud-kitchens',
  },
  {
    name: 'Hotel Restaurants',
    badge: 'Hotel F&B',
    description:
      'Connect dining rooms, lounges, central stockrooms, and multi-outlet F&B reporting within hospitality environments.',
    href: '/solutions/hotels',
  },
  {
    name: 'Cloud Kitchens',
    badge: 'Delivery & Dispatch',
    description:
      'Orchestrate digital orders, multi-station kitchen screens, and automated recipe-based ingredient deduction.',
    href: '/solutions/cloud-kitchens',
  },
];

const RESTAURANTS_FAQS = [
  {
    question: 'How does Servora streamline dining room and table service for restaurants?',
    answer:
      'Servora gives servers and hosts a live visual floor plan showing vacant, occupied, reserved, and cleaning tables, alongside waitlist management, server assignments, course modifiers, and instant kitchen ticket routing.',
  },
  {
    question: 'Can guests split restaurant bills across cash, card, and M-Pesa?',
    answer:
      'Yes. Cashiers and waiters can split bills by item or equal share across multiple payment methods—including cash, card, and Safaricom M-Pesa Daraja STK Push—while recording each tender cleanly against the order and shift ledger.',
  },
  {
    question: 'Does Servora automatically deduct ingredients when a menu item is sold?',
    answer:
      'Yes, once a menu item is linked to a configured Bill of Materials (BOM) recipe with ingredient quantities and units of measurement. When that item is sold through the POS, Servora automatically deducts the configured ingredient quantities from stock and records the movement.',
  },
  {
    question: 'Does Servora support a Kitchen Display System (KDS)?',
    answer:
      'Yes. Servora routes digital tickets from the POS to designated kitchen and bar stations—such as Grill, Bar, Cold Pantry, Pastry, and Expediter screens—with live preparation timers and status updates.',
  },
  {
    question: 'Does Servora support cafés and coffee shops as well as full-service restaurants?',
    answer:
      'Yes. Cafés and coffee shops can use Servora for fast counter checkout, customizable drink modifiers, meal combos, and recipe-level tracking of beans, milk, syrups, and baked goods.',
  },
  {
    question: 'Can Servora support multiple restaurant branches?',
    answer:
      'Yes. Servora supports multi-branch operations with branch-level sales, stock transfers between outlets, role-based staff permissions, and consolidated performance reporting.',
  },
  {
    question: 'How can I request a Servora restaurant demonstration?',
    answer:
      'Click "Book a Restaurant Demo" anywhere on this page to reach our Nairobi team on the Contact page, or call Mavora Technologies Ltd directly.',
  },
];

export default function RestaurantsSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Restaurants & Cafés', path: '/solutions/restaurants' },
          ]),
          buildFaqSchema(RESTAURANTS_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM RESTAURANT HERO --- */}
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
                  <li className="font-bold text-servora-navy">Restaurants &amp; Cafés</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Restaurant &amp; Café Management Solution
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Run Your Restaurant Smarter.{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Serve Every Guest Better.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Manage tables, orders, kitchen operations, payments, recipes, and inventory from one connected restaurant management platform. Servora helps your team coordinate service, control stock, and gain better visibility into daily performance.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Book a Restaurant Demo &rarr;
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
                    src="/images/resources/restaurant-pos-kenya.png"
                    alt="Restaurant staff and guest completing an order and Lipa na M-Pesa payment on a Servora POS terminal"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Dining Room &bull; Cashier &bull; Kitchen &bull; Stockroom
                  </span>
                  <span className="font-mono text-servora-teal">Servora POS 2.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: RESTAURANT OPERATIONS OVERVIEW --- */}
        <section className="py-16 sm:py-20 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Connected Restaurant Workflow
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                Everything Working Together. One Restaurant Platform.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300">
                Servora connects front-of-house seating, ordering, kitchen preparation, checkout, recipe stock deduction, and reporting so teams work from one consistent record.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
              {OPERATIONS_WORKFLOW.map((item, idx) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2 py-0.5 rounded">
                        {item.step}
                      </span>
                      {idx < OPERATIONS_WORKFLOW.length - 1 && (
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

        {/* --- SECTION 3: SMART TABLE & FLOOR MANAGEMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Floor &amp; Table Service
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                Keep Your Dining Room Organized and Your Service Moving.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Give hosts and servers a clear, real-time view of indoor, terrace, and VIP seating areas. Track table states, manage advance reservations and walk-in waitlists, and assign waiters cleanly across shifts.
              </p>
              <ul className="mt-5 space-y-2 text-xs sm:text-sm font-semibold text-servora-navy">
                {[
                  'Visual indoor, terrace, and lounge floor layouts',
                  'Live Vacant, Occupied, Reserved, and Cleaning states',
                  'Table turnover visibility & server assignments',
                  'Reservations and walk-in waitlist management',
                ].map((point) => (
                  <li key={point} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-servora-teal flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Illustrative Floor Plan UI */}
            <div className="lg:col-span-7 rounded-3xl bg-servora-pale border border-gray-200/90 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-extrabold text-servora-navy uppercase tracking-wider">
                  Live Dining Floor Layout
                </span>
                <span className="text-[10px] font-mono text-servora-deepTeal bg-white px-2.5 py-1 rounded-full border border-gray-200">
                  Illustrative Preview
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {ILLUSTRATIVE_TABLES.map((table) => (
                  <div
                    key={table.code}
                    className="rounded-2xl bg-white border border-gray-200/80 p-4 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-servora-navy font-mono">
                        {table.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${table.color}`}
                      >
                        {table.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-servora-navy">{table.area}</p>
                      <p className="text-[10px] text-servora-deepTeal">{table.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 4: FASTER ORDERING & MENU CUSTOMIZATION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Illustrative Order Builder */}
            <div className="lg:col-span-6 order-2 lg:order-1 rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                    Illustrative Order Entry
                  </span>
                  <h3 className="text-base font-extrabold text-servora-navy mt-0.5">
                    Table T-01 &bull; Configurable Dish Ticket
                  </h3>
                </div>
                <span className="rounded-lg bg-servora-pale px-2.5 py-1 text-xs font-mono font-bold text-servora-navy">
                  Qty: 1
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-servora-pale/70">
                  <span className="font-bold text-servora-navy">Main Item</span>
                  <span className="text-servora-deepTeal font-semibold">Grilled Ribeye Steak</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-servora-pale/70">
                  <span className="font-bold text-servora-navy">Portion Size</span>
                  <span className="text-servora-deepTeal font-semibold">300g Full Portion</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-servora-pale/70">
                  <span className="font-bold text-servora-navy">Preparation Preference</span>
                  <span className="text-servora-deepTeal font-semibold">Medium Rare</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-servora-pale/70">
                  <span className="font-bold text-servora-navy">Selected Sides &amp; Add-Ons</span>
                  <span className="text-servora-deepTeal font-semibold">Garlic Mash + Peppercorn Sauce</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-amber-50 border border-amber-200/70">
                  <span className="font-bold text-amber-900">Special Instructions</span>
                  <span className="text-amber-800 font-semibold">Sauce on the side • No nuts</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Menu &amp; Modifier Flexibility
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                Make Every Order Accurate, Flexible, and Easy to Manage.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Structured menu categories, portion variations, preparation preferences, side selections, add-ons, meal combos, and kitchen notes ensure guest preferences reach the culinary team accurately on the first try.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-servora-navy">
                {[
                  'Menu Categories',
                  'Portion Sizes',
                  'Preparation Notes',
                  'Side Selections',
                  'Add-Ons & Extras',
                  'Meal Combos',
                  'Custom Modifiers',
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-white border border-gray-200 px-3 py-1.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: KITCHEN DISPLAY SYSTEM (KDS) --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Kitchen Display System (KDS)
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                From Order to Kitchen. Keep Every Station Connected.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Reduce reliance on handwritten or smudged paper dockets. Digital tickets route automatically to Grill, Cold Pantry, Bar, Pastry, and Expediter screens with live preparation timers and status updates.
              </p>
              <ul className="mt-5 space-y-2 text-xs sm:text-sm font-semibold text-servora-navy">
                {[
                  'Digital kitchen tickets & station-based routing',
                  'Live preparation queues & elapsed SLA timers',
                  'Order prioritization & completion updates',
                  'Clear visibility for chefs and front-of-house teams',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-servora-core flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-lg bg-servora-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/resources/kds-kitchen-display.png"
                  alt="Chef managing Grill, Cold Pantry, Bar, and Pastry tickets on a Servora Kitchen Display System screen"
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 6: RECIPE BOM & INGREDIENT-LEVEL INVENTORY (PRIORITY) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-12">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                  Recipe BOM &amp; Ingredient Inventory
                </span>
                <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                  Every Menu Item Connected to Its Ingredients.
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Servora connects menu sales with recipe and ingredient management, helping restaurants track stock consumption, understand food costs, and maintain better inventory visibility. When a menu item with a configured Bill of Materials (BOM) recipe is sold through the POS, its configured ingredient quantities are deducted from stock automatically.
                </p>
                <p className="mt-3 text-[11px] text-servora-deepTeal/85">
                  Note: Automatic stock deduction relies on properly configured recipes, units of measurement, and product mappings.
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-md bg-servora-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/recipe-bom-food-cost.png"
                    alt="Chef preparing portions next to a Servora Recipe BOM dashboard showing ingredient quantities, stock deduction, and food cost summary"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Illustrative BOM Table */}
            <div className="rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-servora-core font-bold">
                    Illustrative Recipe BOM Example
                  </span>
                  <h3 className="text-lg font-extrabold text-servora-navy">
                    Menu Item Sold: Grilled Chicken Platter (1 Portion)
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-[11px] font-bold">
                  Auto Stock Deduction Triggered
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-servora-deepTeal uppercase text-[10px] tracking-wider">
                      <th className="py-3 pr-4">Ingredient</th>
                      <th className="py-3 px-4">Recipe Quantity</th>
                      <th className="py-3 px-4">Unit of Measure</th>
                      <th className="py-3 pl-4">Inventory Behavior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {BOM_EXAMPLE_ROWS.map((row) => (
                      <tr key={row.ingredient}>
                        <td className="py-3 pr-4 font-bold text-servora-navy">{row.ingredient}</td>
                        <td className="py-3 px-4 font-mono font-bold text-servora-core">
                          {row.quantity}
                        </td>
                        <td className="py-3 px-4 text-servora-deepTeal">{row.unit}</td>
                        <td className="py-3 pl-4 text-servora-deepTeal">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 7: SPLIT BILLING & FLEXIBLE PAYMENTS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Flexible Checkout
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                Checkout That Works Around Your Guests.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Serve groups effortlessly by splitting bills by item or equal share across multiple payment methods—including cash, card, and Safaricom M-Pesa Daraja STK Push—while keeping every tender reconciled to the cashier shift.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/hospitality-software-kenya"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-navy px-6 text-xs font-bold text-white hover:bg-servora-core transition-colors"
                >
                  Explore M-Pesa &amp; Kenya Workflows &rarr;
                </Link>
              </div>
            </div>

            {/* Illustrative Split-Billing Card */}
            <div className="lg:col-span-6 rounded-3xl bg-servora-pale border border-gray-200/90 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-servora-navy uppercase tracking-wider">
                  Group of 4 &bull; Split Check
                </span>
                <span className="text-[10px] font-mono text-servora-deepTeal bg-white px-2.5 py-1 rounded-full border border-gray-200">
                  Illustrative Example
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  { guest: 'Guest 1 & 2 (Shared Items)', tender: 'M-Pesa STK Push', status: 'Callback Verified' },
                  { guest: 'Guest 3 (By Item)', tender: 'Card Payment', status: 'Recorded' },
                  { guest: 'Guest 4 (By Item)', tender: 'Cash Tender', status: 'Drawer Logged' },
                ].map((split) => (
                  <div
                    key={split.guest}
                    className="rounded-xl bg-white border border-gray-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-servora-navy">{split.guest}</p>
                      <p className="text-[11px] text-servora-deepTeal">{split.tender}</p>
                    </div>
                    <span className="inline-flex self-start sm:self-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold">
                      {split.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTIONS 8 & 9: PURCHASING, SUPPLIERS & ANALYTICS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Purchasing & Suppliers */}
            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs">
              <span className="text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Inventory &amp; Purchasing
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Know What You Have. Understand What You Need.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Connect purchasing directly to kitchen stock availability with structured supplier records, Purchase Orders (POs), Goods Received Notes (GRNs), stock transfers, stock valuation, reorder visibility, and wastage tracking.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs font-semibold text-servora-navy">
                {[
                  'Ingredient Stock Levels',
                  'Purchase Orders (POs)',
                  'Goods Received (GRNs)',
                  'Stock Transfers',
                  'Reorder Visibility',
                  'Wastage & Adjustments',
                ].map((item) => (
                  <div key={item} className="rounded-xl bg-servora-pale p-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-servora-teal flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales & Business Analytics */}
            <div className="rounded-3xl bg-servora-navy text-white p-7 sm:p-9 shadow-lg">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Executive Analytics
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-white">
                Turn Restaurant Transactions into Business Insights.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
                Monitor daily sales, payment breakdowns, order volumes, best-selling menu items, stock valuation, food-cost reporting, revenue trends, and branch performance from one dashboard.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs font-semibold text-gray-100">
                {[
                  'Daily Sales & Trends',
                  'Payment Breakdowns',
                  'Best-Selling Items',
                  'Stock Valuation',
                  'Food-Cost Reporting',
                  'Multi-Branch Views',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-servora-teal flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 10: DESIGNED FOR DIFFERENT RESTAURANT MODELS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Flexible Hospitality Formats
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                One Platform. Different Restaurant Operations.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {RESTAURANT_MODELS.map((model) => (
                <article
                  key={model.name}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6 flex flex-col justify-between hover:border-servora-core hover:bg-white hover:shadow-md transition-all"
                >
                  <div>
                    <span className="inline-block rounded-full bg-servora-core/10 px-2.5 py-0.5 text-[10px] font-bold text-servora-core uppercase tracking-wider mb-3">
                      {model.badge}
                    </span>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{model.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">
                      {model.description}
                    </p>
                  </div>
                  <Link
                    href={model.href}
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    Learn More &rarr;
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTIONS 11 & 12: KENYAN MARKET & MULTI-LOCATION --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Kenya &amp; East Africa Ready
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Restaurant Technology That Understands Local Operations.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Built by {SITE_CONFIG.parentCompany.name} in Kilimani, Nairobi with Safaricom M-Pesa Daraja integration, KES transaction workflows, configurable Kenyan tax and invoicing support, offline-aware POS queueing, and local onboarding.
              </p>
              <Link
                href="/hospitality-software-kenya"
                className="mt-5 inline-block text-xs font-bold text-servora-core hover:underline"
              >
                Explore Kenya Hospitality Hub &rarr;
              </Link>
            </div>

            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Multi-Branch Visibility
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Maintain Better Visibility as Your Restaurant Business Expands.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Manage branch-level operations, branch-specific menus, stock movement between outlets, role-based staff permissions, and consolidated performance reporting from one workspace.
              </p>
              <Link
                href="/pricing"
                className="mt-5 inline-block text-xs font-bold text-servora-core hover:underline"
              >
                Compare Multi-Branch Plans &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* --- SECTION 13: RESTAURANT FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Restaurant &amp; Café FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Restaurant &amp; Café POS Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={RESTAURANTS_FAQS} />
          </div>
        </section>

        {/* --- SECTION 14: FINAL CONVERSION CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Give Your Restaurant a Smarter Way to Operate.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Connect your tables, orders, kitchen, payments, and inventory with Servora. Discover how one integrated platform can help your team manage service and business operations more effectively.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Book a Restaurant Demo &rarr;
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Explore All Features
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}