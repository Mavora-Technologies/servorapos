// apps/web/app/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'About Servora by Mavora Technologies | Hospitality Software in Kenya',
  description:
    'Learn about Servora, the hotel and restaurant management platform developed by Mavora Technologies Ltd in Kilimani, Nairobi. Built to simplify hospitality operations across Kenya, East Africa, and beyond.',
  path: '/about',
  keywords: [
    'Servora by Mavora Technologies',
    'Mavora Technologies Ltd Nairobi',
    'Hospitality Software Company Kenya',
    'Hotel and Restaurant Software Developer East Africa',
  ],
});

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- BREADCRUMB & HERO SECTION --- */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">About Mavora Technologies</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              About Mavora Technologies Ltd
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Empowering Hospitality with{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Integrated Hotel &amp; Restaurant Operations
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              {SITE_CONFIG.canonicalBrandDefinition}
            </p>
          </div>
        </section>

        {/* --- OUR MISSION & VISION --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest mb-2 block">
                Our Core Mission
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-4">
                Built for the Realities of Modern Hospitality Management
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-servora-deepTeal mb-4">
                Operating a successful restaurant, café, bar, cloud kitchen, or hotel food-and-beverage outlet requires uncompromising speed at checkout, precise inventory control down to the gram, and real-time kitchen station coordination.
              </p>
              <p className="text-sm sm:text-base leading-relaxed text-servora-deepTeal mb-6">
                Headquartered in Kilimani, Nairobi,{' '}
                <a
                  href={SITE_CONFIG.parentCompany.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-servora-core hover:underline"
                >
                  Mavora Technologies Ltd
                </a>{' '}
                engineered Servora to bring front-of-house POS ordering, kitchen displays, recipe costing, stockroom procurement, Safaricom M-Pesa payments, KRA eTIMS invoicing, and executive reporting into one unified cloud platform.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-bold">
                <Link href="/features" className="text-servora-core hover:underline">
                  Explore Platform Capabilities &rarr;
                </Link>
                <Link href="/solutions/restaurants" className="text-servora-core hover:underline">
                  View Hospitality Solutions &rarr;
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Pillar 1 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-servora-navy mb-1">Speed &amp; Offline Resilience</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Optimized for touchscreen POS terminals and offline-aware queueing during internet interruptions.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-servora-navy mb-1">Localized for Kenya &amp; East Africa</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Native Safaricom M-Pesa Daraja API integration, KES currency workflows, and KRA eTIMS compliance readiness.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-servora-navy mb-1">Precise Recipe &amp; Margin Costing</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Automated recipe BOM stock deduction, food cost percentage calculations, and theoretical vs. actual waste tracking.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-servora-navy mb-1">Enterprise Security &amp; Custody</h3>
                <p className="text-xs text-servora-deepTeal leading-relaxed">
                  Strict multi-tenant branch isolation, granular role-based access control, blind till custody, and immutable audit logs.
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
                Developer &amp; Headquarters
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                {SITE_CONFIG.parentCompany.name}
              </h2>
              <p className="text-xs sm:text-sm text-servora-pale/80 leading-relaxed">
                Concert House, Wood Avenue, Kilimani
                <br />
                Nairobi, Kenya
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Book a Consultation
              </Link>
              <a
                href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Call {SITE_CONFIG.parentCompany.displayPhone}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}