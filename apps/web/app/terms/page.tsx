// apps/web/app/terms/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service | SaaS Subscription & Hardware Terms | Servora',
  description:
    'Read the Terms of Service for Servora POS and Mavora Technologies Ltd. Guidelines covering SaaS subscriptions, M-Pesa billing, hardware procurement, liability, and Kenyan jurisdiction.',
  path: '/terms',
  keywords: [
    'Servora Terms of Service',
    'Mavora Technologies Terms and Conditions',
    'Restaurant Software Agreement Kenya',
  ],
});

export default function TermsPage() {
  const currentYear = 2026;

  const termsPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service — Servora POS by Mavora Technologies',
    url: `${SITE_CONFIG.url}/terms`,
    publisher: {
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Terms of Service', path: '/terms' },
          ]),
          termsPageSchema,
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-12 pb-12 sm:pt-16 sm:pb-16 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">Terms of Service</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Legal &amp; Compliance
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Terms of Service
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Please read these terms carefully before subscribing to Servora POS or engaging Mavora Technologies Ltd for hardware procurement and software services.
            </p>
            <div className="mt-4 text-xs font-medium text-servora-deepTeal">
              Last Updated: January {currentYear} &bull; Effective for Servora Platform Users
            </div>
          </div>
        </section>

        {/* --- CONTENT SECTION --- */}
        <section className="py-16 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-8 text-servora-deepTeal text-xs sm:text-sm leading-relaxed">
            {/* Section 1 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                1. Agreement to Terms
              </h2>
              <p>
                By accessing or using the Servora SaaS platform, mobile applications, point-of-sale terminals, or requesting hardware procurement services from {SITE_CONFIG.parentCompany.name} (&ldquo;Company&rdquo;), you agree to be bound by these Terms of Service. If you are entering into these terms on behalf of a hotel, restaurant, bar, café, or corporate entity, you represent that you possess the legal authority to bind that entity.
              </p>
            </article>

            {/* Section 2 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                2. Software License &amp; Access
              </h2>
              <p>
                Subject to your compliance with these Terms and your active subscription payment, {SITE_CONFIG.parentCompany.name} grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Servora platform for internal restaurant management and operational workflows in Kenya and authorized jurisdictions.
              </p>
            </article>

            {/* Section 3 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                3. Subscriptions, Fees, and Billing
              </h2>
              <p className="mb-2">
                Servora operates on a recurring subscription model (Monthly, Bi-Annual, or Annual billing cycles):
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Subscription fees must be settled in advance according to your selected tier (Starter, Business, Professional, or Enterprise).</li>
                <li>All payments are processed securely through authorized channels including official bank transfers and Safaricom M-Pesa integrations.</li>
                <li>Fees are non-refundable except as expressly determined by {SITE_CONFIG.parentCompany.name} management or mandated under applicable Kenyan consumer protection laws.</li>
              </ul>
            </article>

            {/* Section 4 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                4. Hardware Procurement &amp; Outsourcing
              </h2>
              <p>
                When you engage {SITE_CONFIG.parentCompany.name} to procure, import, test, or install POS hardware terminals, thermal receipt printers, and cash drawers:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-2">
                <li>Hardware quotations are valid for 14 days unless otherwise specified in your formal technical brief.</li>
                <li>Risk of loss or damage passes to the merchant upon successful on-site delivery and handover in Kilimani or designated restaurant outlets.</li>
                <li>Hardware warranties are governed by respective manufacturer defect policies alongside our configuration support guarantee.</li>
              </ul>
            </article>

            {/* Section 5 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                5. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by Kenyan law, {SITE_CONFIG.parentCompany.name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages—including loss of profits, revenue, data, or business interruption—arising out of or related to your use of the Servora platform or hardware peripherals.
              </p>
            </article>

            {/* Section 6 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">6. Governing Law</h2>
              <p>
                These Terms shall be governed by, construed, and enforced in accordance with the laws of the Republic of Kenya. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Nairobi, Kenya.
              </p>
            </article>

            {/* Section 7 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                7. Contact Information
              </h2>
              <p className="mb-3">
                For questions regarding these Terms of Service, billing inquiries, or legal notices, please reach out to our team:
              </p>
              <div className="p-4 rounded-xl bg-servora-pale border border-gray-200 flex flex-col gap-1 text-xs">
                <span className="font-bold text-servora-navy">{SITE_CONFIG.parentCompany.name}</span>
                <span>Concert House, Wood Avenue, Kilimani - Nairobi, Kenya</span>
                <span>
                  Email:{' '}
                  <a
                    href={`mailto:${SITE_CONFIG.parentCompany.email}`}
                    className="text-servora-core font-semibold hover:underline"
                  >
                    {SITE_CONFIG.parentCompany.email}
                  </a>
                </span>
                <span>
                  Phone:{' '}
                  <a
                    href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                    className="text-servora-core font-semibold hover:underline"
                  >
                    {SITE_CONFIG.parentCompany.displayPhone}
                  </a>
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* --- CTA BANNER --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-block rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-2">
                Need Clarification?
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Get in Touch with Our Legal &amp; Sales Team
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Our Kilimani office is available to discuss custom enterprise contracts and service level agreements (SLAs).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Contact Sales via WhatsApp
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}