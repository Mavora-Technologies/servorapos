import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

export default function HardwarePosPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-24 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Reliable Hospitality Hardware & Procurement
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Enterprise-Grade POS Hardware & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Peripherals for Kenya
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Equip your restaurant, bar, café, or cloud kitchen with high-speed touch terminals, thermal receipt printers, secure cash drawers, and offline-ready POS setups.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Request Hardware Quote
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                View Software Plans
              </Link>
            </div>
          </div>
        </section>

        {/* --- WE OUTSOURCE & PROCURE FOR YOU SECTION --- */}
        <section className="py-12 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16 border-b border-white/10">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <span className="inline-flex items-center rounded-md bg-servora-teal/20 px-2.5 py-1 text-xs font-semibold text-servora-teal ring-1 ring-inset ring-servora-teal/30 mb-3">
                Full-Service Procurement & Outsourcing
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                We Outsource & Source Custom Hardware For You
              </h2>
              <p className="text-xs sm:text-sm text-servora-pale/80 leading-relaxed max-w-2xl">
                Don’t have time to navigate suppliers or worry about compatibility? Mavora Technologies sources, imports, tests, and configures all required POS hardware, thermal printers, barcode scanners, and kitchen display tablets specifically tailored to your venue’s footprint.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-servora-teal/20 text-servora-teal flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-medium text-white">Custom Vendor Sourcing & Imports</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-servora-teal/20 text-servora-teal flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-medium text-white">Pre-Configured & Quality Tested</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-servora-teal/20 text-servora-teal flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-medium text-white">On-Site Installation in Kenya</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- HARDWARE GRID SECTION --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-bold text-servora-teal uppercase tracking-widest">Optimized for Servora POS</h2>
              <p className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">Recommended Hardware Bundles</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Item 1 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Touch POS Terminal</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                    High-performance 15-inch capacitive touchscreen terminal designed for fast counter and dining room checkout workflows.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Splash-proof front bezel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Integrated customer display option</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">In Stock / Sourced On Demand</span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Thermal Receipt Printers</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                    High-speed 80mm and 58mm thermal printers for instant customer receipts and kitchen tickets (KDS fallback).
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Ethernet, USB, & Wi-Fi connectivity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Auto-cutter with audio buzzer</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">In Stock / Sourced On Demand</span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Secure Cash Drawers</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                    Heavy-duty steel cash drawers with RJ11/12 printer kick interfaces for secure shift reconciliation and cash management.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>5 bill slots / 8 coin compartments</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>3-position key lock security</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">In Stock / Sourced On Demand</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- CALL TO ACTION BANNER (Clean Corporate Card Style) --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-block rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-2">
                Hardware Solutions
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Need Us to Handle Your Hardware Procurement?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our team to outline your outlet’s technical brief. We will procure, configure, and install everything on-site.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Request Procurement Brief
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}