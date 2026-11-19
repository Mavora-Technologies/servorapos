// apps/web/app/solutions/hotels/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hotel F&B Management Software Kenya | Multi-Outlet POS | Servora',
  description:
    'Manage hotel restaurants, bars, room-service workflows, kitchen operations, inventory transfers, and F&B reporting with Servora hotel management software by Mavora Technologies.',
  path: '/solutions/hotels',
  keywords: [
    'Hotel F&B Management Software Kenya',
    'Hotel Restaurant POS System',
    'Hotel POS Software Nairobi',
    'Hotel Bar Management Software',
    'Hotel Restaurant Management Software Kenya',
    'Hotel Food and Beverage Management System',
    'Hotel Multi-Outlet POS',
    'Hotel Inventory Management Software',
    'Hotel Kitchen Management System',
    'Hotel Room Service Order Management',
    'Hospitality Group Management Software',
    'Hotel Central Store Inventory System',
    'Hotel Restaurant Inventory Software',
    'Multi-Property Hospitality Management',
  ],
});

const HOTEL_REVENUE_CENTERS = [
  'Main Dining Restaurant',
  'Lobby & Cocktail Bar',
  'Poolside Dining & Lounge',
  'Rooftop Restaurant',
  'Banquet & Event Catering',
  'Room Service F&B Delivery',
  'Central Hotel Warehouse',
  'Multi-Station Kitchens',
];

const HOTEL_OUTLETS = [
  { name: 'Main Dining Restaurant', type: 'Full Table Service', desc: 'Separate table floor plans, waiter assignments, and course firing.' },
  { name: 'Lobby & Cocktail Bar', type: 'Tab Management', desc: 'Open bar tabs, pour-cost recipe tracking, and rapid payments.' },
  { name: 'Poolside Lounge', type: 'Quick Service', desc: 'Outdoor mobile POS checkout and guest tab posting.' },
  { name: 'Banquet & Events', type: 'Catering F&B', desc: 'Event menu configuration, food production, and consumption tracking.' },
  { name: 'Room Service Delivery', type: 'In-Room Dining', desc: 'Order capture, kitchen prep routing, and delivery dispatch.' },
];

const ROOM_SERVICE_FLOW = [
  { step: '01', title: 'Order Intake', detail: 'In-room phone or digital request captured.' },
  { step: '02', title: 'POS Entry', detail: 'Items logged to guest folio or outlet check.' },
  { step: '03', title: 'Kitchen Routing', detail: 'Sent directly to hot/cold prep stations.' },
  { step: '04', title: 'Tray Assembly', detail: 'Expediter verifies tray items and cutlery.' },
  { step: '05', title: 'Delivery Dispatch', detail: 'Runner assigned to deliver to guest room.' },
  { step: '06', title: 'Settlement', detail: 'Charge posted or paid via M-Pesa/Card.' },
];

const CENTRAL_STORE_FLOW = [
  { stage: '1. Central Warehouse Receipt', desc: 'Bulk food and beverage stock received from verified suppliers via GRN.' },
  { stage: '2. Departmental Requisitions', desc: 'Bar and kitchen managers submit stock requests from sub-stores.' },
  { stage: '3. Controlled Stock Transfers', desc: 'Items issued from central store to departmental locations with audit logs.' },
  { stage: '4. Outlet Consumption', desc: 'Sub-store inventory depleted as recipes and drinks are sold.' },
];

const PMS_COMPARISON_ROWS = [
  { area: 'Core Function', pms: 'Guest reservations, front-office check-in/out & housekeeping', servora: 'Hotel F&B, restaurant POS, bar tabs & outlet inventory' },
  { area: 'Dining & Outlets', pms: 'Basic billing or limited third-party linkage', servora: 'Full multi-outlet POS, floor plans, modifiers & split bills' },
  { area: 'Kitchen Operations', pms: 'Not typically supported', servora: 'Multi-station KDS routing with SLA timers & bump audit logs' },
  { area: 'Recipe Costing & BOM', pms: 'Not supported', servora: 'Gram-level recipe costing, auto stock deduction & food cost variance' },
  { area: 'Stock & Procurement', pms: 'Basic property assets', servora: 'Central stores, GRNs, POs & departmental stock transfers' },
];

const HOSPITALITY_TYPES = [
  { name: 'Luxury & 5-Star Hotels', detail: 'Coordinated fine dining, bars, lounges, and luxury guest service.' },
  { name: 'Resorts & Beach Hotels', detail: 'Poolside dining, multiple bars, and leisure F&B outlets.' },
  { name: 'Business & Conference Hotels', detail: 'High-volume dining outlets, lobby bars, and banquet catering.' },
  { name: 'Safari Lodges & Camps', detail: 'Remote inventory control, kitchen operations, and lodge dining.' },
  { name: 'Boutique Hotels', detail: 'Intimate dining spaces connected to streamlined stockrooms.' },
  { name: 'Hospitality Groups', detail: 'Multi-property visibility and centralized outlet controls.' },
];

const HOTEL_FAQS = [
  {
    question: 'How does Servora support hotels and hospitality groups?',
    answer:
      'Servora empowers hotels to manage their food and beverage operations seamlessly—including main dining room POS, hotel bars, poolside lounges, room service order tracking, banquets, central store stock transfers, and multi-outlet financial reconciliation.',
  },
  {
    question: 'Does Servora include a full Room Property Management System (PMS)?',
    answer:
      'Servora specializes in hotel F&B, restaurant operations, inventory, and point of sale. While full room-reservation and housekeeping PMS modules are on our future product roadmap, hospitality groups currently deploy Servora alongside their front-office PMS to handle all dining, bar, and revenue reporting.',
  },
  {
    question: 'Can each hotel outlet operate with its own menu and POS terminal?',
    answer:
      'Yes. Multi-outlet management allows hotels to configure distinct menus, pricing, tax rules, and cashier tills for the main restaurant, rooftop lounge, lobby bar, and room service independently from a single tenant workspace.',
  },
  {
    question: 'How do central stores and departmental stock transfers work?',
    answer:
      'Hotels can receive bulk stock into a central warehouse and issue requisitions to departmental sub-stores (such as the main kitchen or bar store) through structured internal stock transfers with full audit trails.',
  },
  {
    question: 'Does Servora automatically deduct ingredients when hotel F&B items are sold?',
    answer:
      'Yes. When menu items are mapped to Bill of Materials (BOM) recipes, every POS sale across any hotel outlet automatically deducts the exact ingredient quantities from the correct departmental inventory location.',
  },
  {
    question: 'How can a hotel request a personalized demonstration?',
    answer:
      'Click "Request Hotel F&B Demo" anywhere on this page to connect with our Nairobi team on the Contact page, or call Mavora Technologies Ltd directly.',
  },
];

export default function HotelsSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Hotel F&B & Outlets', path: '/solutions/hotels' },
          ]),
          buildFaqSchema(HOTEL_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: PREMIUM HOTEL F&B HERO --- */}
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
                  <li className="font-bold text-servora-navy">Hotel F&amp;B &amp; Outlets</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Hotel F&amp;B &amp; Multi-Outlet Management
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Connected Hotel F&amp;B Operations.{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Better Control Across Every Outlet.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Manage hotel restaurants, bars, lounges, room-service workflows, kitchen operations, and inventory through one integrated hospitality management platform. Servora helps hotel teams coordinate service, manage stock, and gain visibility into outlet performance.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Request Hotel F&amp;B Demo &rarr;
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
                    src="/images/resources/kds-kitchen-display.png"
                    alt="Hotel culinary team managing multi-station kitchen display orders across restaurant, bar, and room service"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Hotel Restaurants &bull; Bars &bull; Banquets &bull; Central Store
                  </span>
                  <span className="font-mono text-servora-teal">Servora Hospitality OS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: CONNECTED HOTEL REVENUE CENTERS --- */}
        <section className="py-16 sm:py-20 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                Multi-Property Ecosystem
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                One Platform Connecting Your Hotel&apos;s F&amp;B Operations.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300">
                Unify distinct guest touchpoints under shared inventory, menu, and financial reporting standards.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {HOTEL_REVENUE_CENTERS.map((center) => (
                <div
                  key={center}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center flex flex-col justify-center"
                >
                  <span className="w-2 h-2 rounded-full bg-servora-teal mx-auto mb-2" />
                  <span className="text-xs font-bold text-white leading-snug">{center}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 3: MULTI-OUTLET & VENUE MANAGEMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Multi-Outlet Control
              </span>
              <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.4rem)] font-extrabold text-servora-navy tracking-tight">
                Manage Every Dining and Beverage Outlet with Better Visibility.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Hotels operate best when distinct venues maintain independent service rhythms while contributing to unified management reporting. Configure outlet-specific menus, pricing, cashier tills, and staff permissions from one workspace.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {HOTEL_OUTLETS.map((outlet) => (
                <div
                  key={outlet.name}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-5 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core">
                      {outlet.type}
                    </span>
                    <h3 className="text-sm font-extrabold text-servora-navy mt-1">{outlet.name}</h3>
                    <p className="text-xs text-servora-deepTeal mt-1.5 leading-relaxed">
                      {outlet.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTIONS 4 & 5: HOTEL RESTAURANT & BAR OPERATIONS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hotel Restaurant Operations */}
            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-servora-core uppercase tracking-widest">
                  Dining Room Service
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                  Deliver Consistent Dining Experiences Across Your Hotel.
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Support hotel guests from breakfast buffets to formal evening dining with touch POS terminals, visual floor plans, custom modifiers, split bills, and synchronized kitchen ticket routing.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <Link href="/solutions/restaurants" className="text-xs font-bold text-servora-core hover:underline">
                  Explore Restaurant Solutions &rarr;
                </Link>
              </div>
            </div>

            {/* Hotel Bar & Lounge Operations */}
            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                  Beverage Management
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                  Keep Bar and Lounge Operations Organized.
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Manage lobby bars and rooftop lounges with open bar tabs, pour-cost recipe tracking for spirits and cocktails, blind cashier shift handovers, and rapid payment processing.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <Link href="/solutions/bars-lounges" className="text-xs font-bold text-servora-core hover:underline">
                  Explore Bar &amp; Lounge Solutions &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 6: ROOM-SERVICE ORDER MANAGEMENT --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                In-Room Dining
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Coordinate Room-Service Orders with Better Kitchen Visibility.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal">
                Capture in-room dining requests, route orders to kitchen preparation stations, track tray assembly, and log delivery attribution cleanly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
              {ROOM_SERVICE_FLOW.map((item, idx) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-extrabold text-servora-core bg-servora-core/10 px-2 py-0.5 rounded">
                        {item.step}
                      </span>
                      {idx < ROOM_SERVICE_FLOW.length - 1 && (
                        <span className="hidden lg:inline text-gray-400 font-mono text-xs">&rarr;</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-servora-navy mb-1">{item.title}</h3>
                    <p className="text-[11px] text-servora-deepTeal leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: CENTRAL STORE & STOCK TRANSFERS (PRIORITY) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-12">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                  Central Store &amp; Sub-Stores
                </span>
                <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                  Centralized Inventory. Controlled Distribution Across Hotel Outlets.
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                  Hotels manage bulk receiving at a central warehouse and issue stock requisitions to bar, restaurant, and kitchen sub-stores through structured internal stock transfers. This ensures complete audit visibility over stock movement from receiving to final sale.
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden border border-gray-200/90 shadow-md bg-servora-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/recipe-bom-food-cost.png"
                    alt="Stockroom management and inventory tracking screen in Servora"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CENTRAL_STORE_FLOW.map((flow) => (
                <div
                  key={flow.stage}
                  className="rounded-2xl bg-white border border-gray-200/90 p-5 shadow-2xs"
                >
                  <h3 className="text-xs font-extrabold text-servora-core mb-2">{flow.stage}</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">{flow.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 9: RECIPE BOM & INGREDIENT CONTROL --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Recipe BOM Costing
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Connect Hotel Menu Sales to Ingredient Consumption.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Configure Bill of Materials (BOM) recipes with exact quantities, unit conversions, and wastage percentages. When a guest orders a dish in any hotel restaurant or room service check, Servora automatically depletes the configured ingredients from the active stockroom.
              </p>
            </div>
            <div className="lg:col-span-6 rounded-3xl bg-servora-pale border border-gray-200/80 p-6 sm:p-8">
              <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                Multi-Outlet Recipe Mapping
              </span>
              <h3 className="text-base font-extrabold text-servora-navy mt-1 mb-4">
                Automated Stock Depletion Across Venues
              </h3>
              <ul className="space-y-3 text-xs text-servora-deepTeal">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-servora-teal mt-1.5 flex-shrink-0" />
                  <span>Map cocktails to bar recipes and meals to kitchen BOMs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-servora-teal mt-1.5 flex-shrink-0" />
                  <span>Automatic unit conversion between bulk purchasing and recipe portions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-servora-teal mt-1.5 flex-shrink-0" />
                  <span>Real-time theoretical food cost variance tracking by outlet.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* --- SECTIONS 11 & 12: PAYMENTS & ANALYTICS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-9 shadow-xs">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Financial Control
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-servora-navy">
                Maintain Better Accountability Across Every Outlet.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Manage cashier shifts, blind drawer counts, multi-tender transactions (cash, cards, and Safaricom M-Pesa Daraja STK Push), and outlet-level payment reconciliation without discrepancies.
              </p>
            </div>

            <div className="rounded-3xl bg-servora-navy text-white p-7 sm:p-9 shadow-lg">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest">
                Executive Reporting
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-white">
                See How Your Hotel&apos;s F&amp;B Operations Are Performing.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
                View consolidated gross revenue, outlet sales breakdowns, food cost percentages, best-selling menu items, and cashier reconciliation reports instantly from your executive dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 13: SUPPORT FOR DIFFERENT HOTEL TYPES --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hotel Environments
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Designed for Diverse Hospitality Environments
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {HOSPITALITY_TYPES.map((type) => (
                <div
                  key={type.name}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-extrabold text-servora-navy mb-2">{type.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed">{type.detail}</p>
                  </div>
                  <Link
                    href="/contact"
                    className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-bold text-servora-core hover:underline inline-block"
                  >
                    Request Hotel Demo &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 15: SPECIALIZED F&B MANAGEMENT THAT COMPLEMENTS YOUR HOTEL PMS (PRIORITY) --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-white border border-gray-200/90 p-7 sm:p-12 shadow-sm">
            <div className="max-w-3xl mb-10">
              <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Accurate Platform Scope
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-servora-navy tracking-tight">
                Specialized F&amp;B Management That Complements Your Hotel PMS.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Servora focuses on hotel food and beverage operations, restaurant POS, inventory, and outlet management. Hotels can deploy it alongside their existing front-office Property Management System where appropriate.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-2xs">
              <div className="grid grid-cols-1 md:grid-cols-12 bg-servora-navy text-white text-xs font-bold uppercase tracking-wider px-6 py-4">
                <div className="md:col-span-4">Functional Area</div>
                <div className="hidden md:block md:col-span-4 text-gray-300">Front-Office Hotel PMS</div>
                <div className="hidden md:block md:col-span-4 text-servora-teal">Servora Hospitality F&amp;B</div>
              </div>
              <div className="divide-y divide-gray-200 bg-white">
                {PMS_COMPARISON_ROWS.map((row) => (
                  <div
                    key={row.area}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 text-xs items-center"
                  >
                    <div className="md:col-span-4 font-bold text-servora-navy">{row.area}</div>
                    <div className="md:col-span-4 text-servora-deepTeal">
                      <span className="md:hidden font-bold text-gray-500 mr-1">PMS:</span>
                      {row.pms}
                    </div>
                    <div className="md:col-span-4 font-semibold text-servora-navy">
                      <span className="md:hidden font-bold text-servora-teal mr-1">Servora:</span>
                      {row.servora}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 17: HOTEL FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hotel F&amp;B FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Hotel F&amp;B Software Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={HOTEL_FAQS} />
          </div>
        </section>

        {/* --- SECTION 18: FINAL HOTEL DEMO CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Bring Your Hotel&apos;s F&amp;B Operations Together with Servora.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              From the main restaurant to the bar, kitchen, and central store, discover how Servora can help your teams coordinate service, manage inventory, and gain better visibility across hotel operations.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Request Hotel F&amp;B Demo &rarr;
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