import Link from "next/link";
import Header from "../../../components/layout/Header";
import Footer from "../../../components/layout/Footer";

export default function CloudKitchensSolutionPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-24 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Hospitality Solutions &bull; Cloud Kitchens & Dark Kitchens
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Multi-Channel Order Aggregation & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                High-Velocity Kitchen Dispatch
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Unify delivery apps, phone orders, and walk-ins into a single kitchen display system (KDS). Optimize prep times and eliminate order bottlenecks across your virtual brands.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Request Cloud Kitchen Demo
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

        {/* --- FULL-SERVICE INTEGRATION BANNER (Clean Corporate Card Style) --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <span className="inline-flex items-center rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-3">
                Virtual Brand Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-3">
                Manage Multiple Virtual Brands From One Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-2xl">
                Run multiple delivery-only menus out of a single kitchen hub. Servora automatically routes items to appropriate preparation stations while consolidating inventory deductions down to the exact gram.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-semibold text-servora-navy">Centralized Order Aggregation</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-semibold text-servora-navy">Real-Time Kitchen Display (KDS)</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-servora-pale border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-semibold text-servora-navy">Automated Stock & Recipe Costing</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- CAPABILITIES GRID SECTION --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-bold text-servora-teal uppercase tracking-widest">Optimized for High-Volume Prep</h2>
              <p className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">Core Cloud Kitchen Capabilities</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Feature 1 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Cross-Platform Aggregation</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                    Bring third-party delivery orders, direct website orders, and phone dispatches into one seamless queue without duplicate tablet clutter.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Single screen management</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Automated ticket printing</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">High Velocity Ready</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Kitchen Display System (KDS)</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                    Replace paper tickets with color-coded digital displays that track preparation times, delay alerts, and rider pickup queues.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Station routing (Grill, Prep, Bar)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Real-time prep analytics</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">Zero Paper Waste</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-6">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">Live Inventory & Wastage Control</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed mb-6">
                    Monitor stock levels across multiple virtual kitchens. Automatically deduct ingredients per order and flag low stocks instantly.
                  </p>
                  <ul className="flex flex-col gap-2.5 text-xs text-servora-deepTeal border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Recipe-level consumption</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-servora-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span>Low stock SMS/Email alerts</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <span className="text-xs text-servora-deepTeal font-semibold uppercase tracking-wider">Precision Control</span>
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
                Get Started Today
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Ready to Scale Your Cloud Kitchen Operations?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani team to outline your virtual brands and delivery integration requirements.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Contact Sales Team
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}