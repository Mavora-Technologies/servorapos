// apps/web/app/hospitality-software-kenya/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Best Hotel & Restaurant Management Software in Kenya | Servora',
  description:
    'Leading hospitality management and restaurant POS software in Kenya by Mavora Technologies (Kilimani, Nairobi). Featuring native M-Pesa Daraja STK push, KRA eTIMS invoicing, and offline resilience.',
  path: '/hospitality-software-kenya',
  keywords: [
    'Hotel Management System Kenya',
    'Restaurant POS System Nairobi',
    'Best Restaurant Software Kenya',
    'M-Pesa Integrated POS System',
    'Hospitality Management Software Kenya',
    'Servora Mavora Technologies',
  ],
});

const KENYA_FAQS = [
  {
    question: 'Why is Servora considered a top restaurant POS and hotel management system in Kenya?',
    answer:
      'Servora is engineered specifically for the operational realities of Kenyan hospitality businesses. It provides native Safaricom M-Pesa Daraja integration for instant STK Push and C2B till reconciliation, KES currency support, 16% VAT and 2% Catering Levy tax calculations, KRA eTIMS invoice readiness, and offline-resilient POS checkouts.',
  },
  {
    question: 'Where is Mavora Technologies located in Nairobi?',
    answer:
      'Mavora Technologies Ltd is headquartered at Concert House, Wood Avenue, Kilimani, Nairobi, Kenya. Our local engineering and customer success team provides hands-on onboarding, menu configuration, and hardware setup for restaurants across Nairobi and East Africa.',
  },
];

export default function KenyaSoftwarePage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Hospitality Software Kenya', path: '/hospitality-software-kenya' },
          ]),
          buildFaqSchema(KENYA_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO SECTION --- */}
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
                <li className="font-bold text-servora-navy">Kenya &amp; East Africa</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Regional Market Leader &bull; Kenya &amp; East Africa
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              The Best Hotel &amp; Restaurant Management Software in{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Kenya &amp; East Africa
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Developed by {SITE_CONFIG.parentCompany.name} in Kilimani, Nairobi, Servora is trusted by leading restaurants, bars, cafés, and cloud kitchens for reliable POS checkout, M-Pesa payments, and inventory control.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Book a Nairobi Demo
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-7 text-sm font-semibold text-servora-navy shadow-sm transition-all hover:border-servora-core"
              >
                View KES Pricing Plans
              </Link>
            </div>
          </div>
        </section>

        {/* --- KENYAN LOCALIZATION PILLARS --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest">
                Tailored for Local Workflows
              </span>
              <h2 className="mt-2 text-2xl font-bold text-servora-navy sm:text-3xl">
                Engineered for Safaricom M-Pesa, KRA Tax Compliance &amp; Local Support
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Safaricom M-Pesa Daraja Integration
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Trigger automated STK push payment prompts directly to customer mobile numbers from the POS terminal, instantly reconciling incoming Till and Paybill callbacks.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    KRA Tax &amp; eTIMS Readiness
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Configure standard Kenyan 16% VAT and 2% Catering Levy rules per menu item, producing compliant sales summaries and fiscal invoicing data.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-servora-navy mb-2">
                    Nairobi-Based Onboarding &amp; Support
                  </h3>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    Our engineering and customer success desk is based right in Kilimani, Nairobi, offering rapid response times, hardware delivery, and staff training.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- KENYA FAQS --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-servora-navy text-center mb-8">
              Hospitality Software in Kenya — FAQ
            </h2>
            <div className="space-y-4">
              {KENYA_FAQS.map((faq) => (
                <article
                  key={faq.question}
                  className="rounded-2xl bg-servora-pale border border-gray-200 p-6"
                >
                  <h3 className="text-base font-bold text-servora-navy">{faq.question}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --- CALL TO ACTION BANNER --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-block rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-2">
                Get Started Today
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Ready to Upgrade Your Kenyan Hospitality Outlets?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani team via WhatsApp to discuss your restaurant branches, M-Pesa integration, and POS hardware needs.
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