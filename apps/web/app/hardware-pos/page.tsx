// apps/web/app/hardware-pos/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'POS Hardware Kenya | Touch Terminals, Printers & Cash Drawers | Servora',
  description:
    'Source and configure restaurant POS hardware in Kenya with Mavora Technologies. Explore touchscreen POS terminals, thermal receipt printers, cash drawers, and kitchen display systems for Servora.',
  path: '/hardware-pos',
  keywords: [
    'POS Hardware Kenya',
    'POS Machines Kenya',
    'Restaurant POS Hardware Kenya',
    'Touchscreen POS Terminal Nairobi',
    'Thermal Receipt Printers Kenya',
    'POS Cash Drawers Kenya',
    'Kitchen Display System Hardware Kenya',
    'Restaurant Touchscreen Computers',
    '80mm Thermal Receipt Printer',
    'POS Hardware Procurement Nairobi',
  ],
});

const PROCUREMENT_STEPS = [
  {
    step: '01',
    title: 'Requirements Assessment',
    detail: 'We evaluate your venue type, service points, checkout counters, kitchen workflow, and network layout.',
  },
  {
    step: '02',
    title: 'Hardware Sourcing',
    detail: 'We select appropriate, commercial-grade POS terminals, printers, cash drawers, and KDS displays.',
  },
  {
    step: '03',
    title: 'Pre-Configuration',
    detail: 'Terminals and peripherals are configured and optimized specifically for your Servora cloud environment.',
  },
  {
    step: '04',
    title: 'Rigorous Testing',
    detail: 'We test network connectivity, auto-cutters, printer drivers, and cash drawer triggers before delivery.',
  },
  {
    step: '05',
    title: 'On-Site Installation',
    detail: 'Our Kilimani team deploys, installs, and connects your complete hardware setup across your venue.',
  },
];

const HARDWARE_CATALOG = [
  {
    category: 'Touchscreen POS Terminals',
    desc: 'High-performance 15-inch capacitive touchscreen terminals designed for fast counter and dining room checkout workflows.',
    specs: ['Splash-proof front bezel', 'Capacitive multi-touch display', 'Integrated customer display options', 'Robust aluminium-alloy stand'],
    badge: 'Checkout Core',
  },
  {
    category: 'Thermal Receipt Printers',
    desc: 'High-speed 80mm and 58mm thermal printers for instant customer receipts and kitchen order tickets.',
    specs: ['Ethernet, USB, & Wi-Fi connectivity', 'Auto-cutter with kitchen audio buzzer', 'ESC/POS command compatibility', 'Drop-in paper loading'],
    badge: 'Receipts & KDS',
  },
  {
    category: 'Secure Cash Drawers',
    desc: 'Heavy-duty steel cash drawers with RJ11/12 printer kick interfaces for secure shift reconciliation and cash custody.',
    specs: ['5 bill slots / 8 coin compartments', '3-position key lock security', 'Heavy-duty steel ball-bearing slides', 'Instant printer-kick trigger'],
    badge: 'Cash Custody',
  },
  {
    category: 'Kitchen Display System (KDS) Screens',
    desc: 'Commercial-grade touch display tablets and rugged monitors mounted in the kitchen for digital ticket management.',
    specs: ['High-brightness anti-glare screen', 'Heat and steam-resistant casing', 'Wall or arm mounting flexibility', 'Seamless Servora KDS integration'],
    badge: 'Kitchen Prep',
  },
  {
    category: 'Barcode Scanners & Peripherals',
    desc: 'Fast 1D/2D barcode scanners and accessories to support retail inventory receiving and stock audits.',
    specs: ['Omnidirectional laser scanning', 'Plug-and-play USB connectivity', 'Durable drop-resistant housing', 'Fast barcode recognition'],
    badge: 'Stock & Inventory',
  },
];

const HARDWARE_BUNDLES = [
  {
    name: 'Restaurant POS Setup',
    bestFor: 'Full-Service & Casual Dining',
    items: ['15-inch Touchscreen POS Terminal', '80mm Thermal Receipt Printer', 'RJ11 Heavy-Duty Cash Drawer', 'Kitchen Order Printer'],
    desc: 'Designed for dining rooms, table service, and kitchen communication.',
  },
  {
    name: 'Bar & Lounge POS Setup',
    bestFor: 'High-Energy Lounges & Pubs',
    items: ['Counter POS Terminal / Tablet', 'High-Speed 80mm Bar Printer', 'Secure Cash Drawer', 'Optional Bar KDS Screen'],
    desc: 'Optimized for rapid tab opening, round additions, and fast checkout.',
  },
  {
    name: 'Hotel F&B POS Setup',
    bestFor: 'Multi-Outlet Hotels & Resorts',
    items: ['Multiple Outlet POS Terminals', 'Central & Outlet Receipt Printers', 'Departmental Cash Drawers', 'Multi-Station KDS Setup'],
    desc: 'Coordinated hardware deployment across restaurants, bars, and room service.',
  },
  {
    name: 'Cloud Kitchen Setup',
    bestFor: 'Dark Kitchens & Delivery Hubs',
    items: ['Order Management Terminal', 'Multi-Station KDS Screens (Grill/Fry/Prep)', 'Dispatch Label Printers', 'Packaging Station Display'],
    desc: 'Eliminates paper dockets to maximize speed across virtual food brands.',
  },
];

const HARDWARE_FAQS = [
  {
    question: 'Does Mavora Technologies supply and install POS hardware in Kenya?',
    answer:
      'Yes. Mavora Technologies sources, configures, quality-tests, and installs touchscreen POS terminals, 80mm/58mm thermal receipt printers, RJ11 cash drawers, barcode scanners, and Kitchen Display System (KDS) screens across Nairobi and Kenya.',
  },
  {
    question: 'Can Servora run on existing restaurant tablets or Windows terminals?',
    answer:
      'Yes. Servora is a cloud-based web application compatible with Windows POS terminals, Android tablets, iPads, and standard desktop browsers, supporting ESC/POS thermal printers and standard network or USB peripherals.',
  },
  {
    question: 'What hardware does a standard restaurant POS station require?',
    answer:
      'A standard checkout station typically requires a touchscreen POS terminal or tablet, an 80mm thermal receipt printer with an auto-cutter, and an RJ11 heavy-duty cash drawer connected directly to the printer.',
  },
  {
    question: 'Can I use my existing thermal receipt printer with Servora?',
    answer:
      'In most cases, yes. Servora supports standard ESC/POS network and USB thermal printers. Our technical team can verify printer compatibility during your hardware assessment.',
  },
  {
    question: 'Does the hardware quotation include professional on-site installation?',
    answer:
      'Yes. Mavora Technologies provides complete procurement, pre-configuration, testing, and on-site installation across Nairobi and surrounding regions to ensure your POS environment is fully operational.',
  },
];

export default function HardwarePosPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Hardware & POS', path: '/hardware-pos' },
          ]),
          buildFaqSchema(HARDWARE_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO SECTION --- */}
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
                  <li className="font-bold text-servora-navy">POS Hardware &amp; Terminals</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Hardware Procurement &amp; Deployment Partner
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.3rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Complete POS Hardware Solutions for{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Modern Hospitality Businesses.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                From touchscreen POS terminals and high-speed thermal printers to secure cash drawers and kitchen display systems, Mavora Technologies helps you source, configure, and deploy the hardware required to run your hospitality operations with Servora.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Request Hardware Quote &rarr;
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-servora-core hover:text-servora-core"
                >
                  Explore Software Plans
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
                    alt="Professional Servora touchscreen POS terminal, thermal printer, and cash drawer hardware setup"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    Touch Terminals &bull; 80mm Thermal Printers &bull; RJ11 Cash Drawers &bull; KDS Displays
                  </span>
                  <span className="font-mono text-servora-teal">Turnkey Hardware by Mavora</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: PROCUREMENT PROCESS TIMELINE --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                End-to-End Deployment
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                We Handle Your POS Hardware Procurement from Sourcing to Installation.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-gray-300">
                Avoid incompatible drivers and unverified suppliers. Mavora Technologies sources, tests, and deploys equipment configured for your venue.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {PROCUREMENT_STEPS.map((p, idx) => (
                <div
                  key={p.step}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2 py-0.5 rounded">
                        STEP {p.step}
                      </span>
                      {idx < PROCUREMENT_STEPS.length - 1 && (
                        <span className="hidden lg:inline text-gray-400 font-mono text-xs">&rarr;</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{p.title}</h3>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 3: HARDWARE CATALOG --- */}
        <section className="py-16 sm:py-24 w-full bg-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hardware Equipment
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Commercial-Grade Peripherals Built for Hospitality Reliability
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {HARDWARE_CATALOG.map((item) => (
                <div
                  key={item.category}
                  className="rounded-3xl bg-servora-pale border border-gray-200/80 p-7 flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <span className="inline-block rounded-full bg-servora-core/10 px-3 py-1 text-[10px] font-bold text-servora-core uppercase tracking-wider mb-3">
                      {item.badge}
                    </span>
                    <h3 className="text-lg font-extrabold text-servora-navy mb-2">{item.category}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed mb-4">{item.desc}</p>
                    <ul className="space-y-2 text-xs font-semibold text-servora-navy border-t border-gray-200/70 pt-4">
                      {item.specs.map((spec) => (
                        <li key={spec} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-servora-teal flex-shrink-0" />
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200/70 flex items-center justify-between text-xs font-bold text-servora-core">
                    <span>Sourced On Demand</span>
                    <Link href="/contact" className="hover:underline">Inquire &rarr;</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 4: HARDWARE CONFIGURATION BUNDLES --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Deployment Setups
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Recommended POS Hardware Setups for Different Business Types
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HARDWARE_BUNDLES.map((bundle) => (
                <div
                  key={bundle.name}
                  className="rounded-3xl bg-white border border-gray-200/90 p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-servora-core font-bold">
                      {bundle.bestFor}
                    </span>
                    <h3 className="text-base font-extrabold text-servora-navy mt-1 mb-2">{bundle.name}</h3>
                    <p className="text-xs text-servora-deepTeal leading-relaxed mb-4">{bundle.desc}</p>
                    <div className="space-y-1.5 pt-3 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-servora-navy uppercase">Bundle Includes:</p>
                      {bundle.items.map((i) => (
                        <p key={i} className="text-xs text-servora-deepTeal flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-servora-teal" />
                          <span>{i}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <Link
                    href="/contact"
                    className="mt-6 inline-flex w-full h-10 items-center justify-center rounded-xl bg-servora-pale text-xs font-bold text-servora-navy hover:bg-servora-core hover:text-white transition-colors"
                  >
                    Get Setup Quote &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: HARDWARE WORKFLOW & INTEGRATION --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="inline-block rounded-full bg-servora-core/10 px-3.5 py-1 text-[11px] font-bold text-servora-core uppercase tracking-widest">
                Ecosystem Architecture
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                One Connected Hardware Environment. One Smarter Operation.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Physical peripherals communicate seamlessly with the Servora cloud application. When a cashier completes an order, the terminal triggers the thermal receipt printer, kicks the cash drawer open, and routes kitchen orders instantly without lag.
              </p>
            </div>
            <div className="lg:col-span-6 rounded-3xl bg-servora-navy text-white p-7 sm:p-9 shadow-lg space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-servora-teal">
                Hardware Synchronization
              </span>
              <h3 className="text-lg font-extrabold text-white">
                Zero-Lag Peripheral Triggering
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Our technicians configure local network settings, static IP assignments for kitchen printers, and USB port mappings so your checkout counter never skips a beat during peak hours.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 14: HARDWARE FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Hardware FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                POS Hardware &amp; Compatibility Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={HARDWARE_FAQS} />
          </div>
        </section>

        {/* --- SECTION 13: FINAL CONVERSION SECTION --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Simplify Service. Grow Smarter.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Let&apos;s Configure the Right POS Hardware for Your Business.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Tell us about your business, your service points, and your operational requirements. Our team can help you identify the right POS hardware configuration for your Servora environment.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Request Hardware Quote &rarr;
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