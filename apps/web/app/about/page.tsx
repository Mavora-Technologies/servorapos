import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-24 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              About Mavora Technologies
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Empowering Hospitality with <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Intelligent Restaurant Operations
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Servora is a premium, dependable restaurant operations and Point of Sale (POS) platform developed by Mavora Technologies to simplify service and help hospitality businesses grow smarter.
            </p>
          </div>
        </section>

        {/* --- OUR MISSION & VISION --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xs font-bold text-servora-teal uppercase tracking-widest mb-2">Our Core Mission</h2>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-4">
                Built for the realities of modern restaurant management
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-servora-deepTeal mb-4">
                Operating a successful restaurant, café, bar, or cloud kitchen requires uncompromising speed at checkout, precise inventory control down to the gram, and real-time kitchen coordination. 
              </p>
              <p className="text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Headquartered in Kilimani, Nairobi, Mavora Technologies built Servora to bring front-of-house ordering, kitchen displays, stockroom purchasing, M-Pesa payments, and executive reporting into one unified cloud platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Pillar 1 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-servora-navy mb-1">Speed & Reliability</h4>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Optimized for touchscreen POS terminals and offline-aware resilience during internet interruptions.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-servora-navy mb-1">Tailored for Kenya</h4>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Native integration with official M-Pesa Daraja APIs and multi-branch isolation standards.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-servora-navy mb-1">Precise Costing</h4>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Automated recipe consumption, food cost percentage calculations, and theoretical vs. actual waste tracking.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-servora-navy mb-1">Enterprise Security</h4>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Strict multi-tenant architecture, granular role-based access control, and immutable audit logs.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* --- HQ & LOCATION BANNER --- */}
        <section className="py-16 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-2 block">
                Headquarters
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                Mavora Technologies Ltd
              </h2>
              <p className="text-xs sm:text-sm text-servora-pale/80 leading-relaxed">
                Wood Garden Road, off Wood Avenue, Kilimani<br />
                Nairobi, Kenya
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Contact Our Team
              </Link>
              <a
                href="tel:+254795707823"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Call +254 (0) 795 707 823
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}