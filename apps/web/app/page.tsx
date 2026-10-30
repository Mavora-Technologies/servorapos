import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-32 w-full px-4 sm:px-8 lg:px-16">
          <div 
            aria-hidden="true" 
            className="absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80 w-full"
          >
            <div 
              className="aspect-[1155/678] w-full max-w-7xl mx-auto bg-gradient-to-tr from-[#0554F4] to-[#0C88FB] opacity-15"
              style={{
                clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
              }}
            />
          </div>

          <div className="w-full flex flex-col items-center text-center">
            
            <div className="inline-flex items-center gap-x-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-servora-navy shadow-sm ring-1 ring-inset ring-servora-core/15 mb-6">
              <span className="inline-block h-2 w-2 rounded-full bg-servora-teal animate-pulse" />
              <span className="text-servora-teal font-bold uppercase tracking-wider text-[10px]">
                Servora
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-servora-deepTeal">Enterprise Restaurant Platform</span>
            </div>

            <h1 className="w-full text-4xl font-extrabold tracking-tight text-servora-navy sm:text-5xl lg:text-6xl leading-[1.15]">
              Simplify Service.<br className="hidden sm:inline" />{" "}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Grow Smarter.
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              A dependable multi-tenant restaurant operations & POS platform built by Mavora Technologies. Streamline checkout, kitchen dispatch, recipe costing, M-Pesa payments, and analytics from one unified cloud platform.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md shadow-servora-core/20 transition-all hover:bg-blue-700 hover:shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core hover:text-servora-core"
              >
                Book Live Demo
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200/60 grid grid-cols-2 gap-4 sm:grid-cols-4 w-full max-w-5xl text-left text-xs text-servora-deepTeal font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Native M-Pesa Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Multi-Branch Isolation</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Offline-Aware POS</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Real-Time Recipe Costing</span>
              </div>
            </div>

          </div>
        </section>

        {/* --- SYSTEM PREVIEW CARD --- */}
        <section className="pb-16 sm:pb-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full rounded-2xl bg-servora-navy p-4 sm:p-8 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-gray-400">servora.co / pos-checkout</span>
              </div>
              <span className="inline-flex items-center rounded-md bg-servora-teal/20 px-2.5 py-1 text-[10px] font-medium text-servora-teal ring-1 ring-inset ring-servora-teal/30">
                Live Operations Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
              <div className="rounded-xl bg-white/5 p-5 border border-white/10">
                <p className="text-xs text-gray-400">Today's Net Sales</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">KES 148,250</p>
                <span className="text-[11px] text-emerald-400 font-medium">↑ +14% vs yesterday</span>
              </div>
              <div className="rounded-xl bg-white/5 p-5 border border-white/10">
                <p className="text-xs text-gray-400">Active Kitchen Orders</p>
                <p className="text-2xl sm:text-3xl font-bold text-servora-bright mt-1">12 Orders</p>
                <span className="text-[11px] text-servora-teal font-medium">Avg Prep Time: 11.4 mins</span>
              </div>
              <div className="rounded-xl bg-white/5 p-5 border border-white/10">
                <p className="text-xs text-gray-400">Ingredient Stock Alert</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-400 mt-1">3 Items Low</p>
                <span className="text-[11px] text-amber-300 font-medium">Whole Milk, Espresso Beans</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- CORE CAPABILITIES --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="w-full mb-12 text-center">
            <h2 className="text-xs font-bold text-servora-teal uppercase tracking-widest">Architected for Operational Excellence</h2>
            <p className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">Everything your restaurant needs to thrive</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
              <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">01</div>
              <h3 className="text-base font-bold text-servora-navy mb-2">High-Speed POS</h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">Touch-optimized layout with modifier picks, split bills, offline queueing, and instant M-Pesa payment validation.</p>
            </div>
            <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
              <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">02</div>
              <h3 className="text-base font-bold text-servora-navy mb-2">Recipe & Inventory</h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">Automated stock deduction down to the gram. Calculate precise recipe costs, food cost %, and theoretical vs actual usage.</p>
            </div>
            <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
              <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">03</div>
              <h3 className="text-base font-bold text-servora-navy mb-2">KDS & Floor Plan</h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">Real-time ticket routing by kitchen station, dining table timers, floor layout management, and delay warnings.</p>
            </div>
            <div className="p-6 rounded-xl bg-servora-pale border border-gray-100 transition-all hover:border-servora-core/30 hover:shadow-md">
              <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-4">04</div>
              <h3 className="text-base font-bold text-servora-navy mb-2">Executive Analytics</h3>
              <p className="text-xs text-servora-deepTeal leading-relaxed">Database-driven financial summaries, sales trends, cashier shift reconciliations, waste tracking, and gross margin insights.</p>
            </div>
          </div>
        </section>

        {/* --- SOLUTIONS & VERTICALS HIGHLIGHT --- */}
        <section className="py-20 w-full bg-servora-pale px-4 sm:px-8 lg:px-16 border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-servora-teal font-bold uppercase tracking-widest text-xs">Tailored Industry Verticals</span>
              <h2 className="text-3xl font-extrabold text-servora-navy mt-2 sm:text-4xl">Built for Every Kenyan Hospitality Model</h2>
              <p className="text-sm text-servora-deepTeal mt-3">Whether you manage a bustling Kilimani café, a multi-branch restaurant chain, or a dark kitchen, Servora adapts seamlessly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Restaurants & Cafés</h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">High-speed table service, visual floor plans, split billing across guests, modifier management, and instant kitchen ticket routing.</p>
                </div>
                <Link href="/solutions/restaurants" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Restaurant Solutions &rarr;
                </Link>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Cloud Kitchens</h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">Multi-channel order aggregation, dedicated KDS displays for delivery drivers, automated recipe stock deduction, and real-time prep timers.</p>
                </div>
                <Link href="/solutions/cloud-kitchens" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Cloud Kitchens &rarr;
                </Link>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center font-bold mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.7 2.7 0 00-3 0 2.7 2.7 0 01-3 0 2.7 2.7 0 00-3 0 2.7 2.7 0 01-3 0 2.7 2.7 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h6m-7 18h8a2 2 0 002-2v-5a2 2 0 00-2-2H8a2 2 0 00-2 2v5a2 2 0 002 2z"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Bars & Lounges</h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">Cashier shift reconciliation, open tab tracking, pour cost monitoring, and rigorous stock controls against bottle and keg wastage.</p>
                </div>
                <Link href="/solutions/bars-lounges" className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1">
                  Explore Bars & Lounges &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- KENYAN PAYMENT & HARDWARE SPOTLIGHT --- */}
        <section className="py-20 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 flex flex-col gap-6">
              <span className="text-servora-teal font-bold uppercase tracking-widest text-xs">Localized Infrastructure</span>
              <h2 className="text-3xl font-extrabold text-servora-navy sm:text-4xl leading-tight">
                Engineered for Safaricom M-Pesa & Robust POS Hardware
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Servora integrates natively with the Safaricom Daraja API for instant STK Push payment verification, eliminating counterfeit transactions and reducing checkout times. Paired with our enterprise hardware procurement in Kilimani, Nairobi, you get a turnkey solution.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-semibold text-servora-navy">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Instant M-Pesa STK Push Callback</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Thermal Printer & Cash Drawer Sync</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Offline Queueing & Sync Protection</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span>Multi-Branch Role-Based Isolation</span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/hardware-pos"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-navy px-7 text-xs font-bold text-white shadow-md transition-all hover:bg-servora-core"
                >
                  View Hardware Catalog & Bundles
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full rounded-2xl bg-servora-pale p-8 border border-gray-200/80 shadow-lg flex flex-col justify-center gap-6">
              <div className="border-b border-gray-200 pb-4">
                <span className="text-[10px] font-bold text-servora-core uppercase tracking-wider">Mavora Technologies Standard</span>
                <h3 className="text-xl font-bold text-servora-navy mt-1">Ready to Upgrade Your Operations?</h3>
              </div>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                Join leading Nairobi restaurants, bars, and cloud kitchens that trust Servora for reliable inventory control, real-time margin tracking, and secure financial reconciliation.
              </p>
              <div className="p-4 rounded-xl bg-white border border-gray-200 flex flex-col gap-2">
                <span className="text-xs font-bold text-servora-navy">Visit Our Kilimani Office</span>
                <span className="text-xs text-servora-deepTeal font-mono">Concert House, Wood Avenue, Kilimani - Nairobi, Kenya</span>
                <a href="tel:+254795707823" className="text-xs font-bold text-servora-core hover:underline">+254 795 707 823</a>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CONVERSION CTA --- */}
        <section className="py-20 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-servora-navy p-8 sm:p-14 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-core/20 blur-3xl pointer-events-none" />
            <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-xs font-bold text-servora-teal uppercase tracking-wider mb-4">
              Get Started Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Transform Your Restaurant Management with Servora
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mb-8 leading-relaxed">
              Experience enterprise reliability, instant M-Pesa processing, and precise inventory tracking. Set up your branch in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-8 text-sm font-bold text-white shadow-lg shadow-servora-core/30 transition-all hover:bg-blue-600"
              >
                Start Your Free Trial
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}