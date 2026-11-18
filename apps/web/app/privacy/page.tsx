// apps/web/app/privacy/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy | Data Protection & Security | Servora POS',
  description:
    'Read the Privacy Policy of Mavora Technologies Ltd. Learn how we safeguard tenant data, merchant records, M-Pesa transaction logs, and customer privacy for Servora POS in Kenya and East Africa.',
  path: '/privacy',
  keywords: [
    'Servora Privacy Policy',
    'Mavora Technologies Data Protection',
    'Restaurant POS Privacy Policy Kenya',
  ],
});

export default function PrivacyPage() {
  const currentYear = 2026;

  const privacyPolicySchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy — Servora POS by Mavora Technologies',
    url: `${SITE_CONFIG.url}/privacy`,
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
            { name: 'Privacy Policy', path: '/privacy' },
          ]),
          privacyPolicySchema,
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
                <li className="font-bold text-servora-navy">Privacy Policy</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Legal &amp; Compliance
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              At Mavora Technologies Ltd, we respect your privacy and are committed to protecting the data of your restaurant, staff, and customers.
            </p>
            <div className="mt-4 text-xs font-medium text-servora-deepTeal">
              Last Updated: January {currentYear} &bull; Effective for Servora Hospitality Platforms
            </div>
          </div>
        </section>

        {/* --- CONTENT SECTION --- */}
        <section className="py-16 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-8 text-servora-deepTeal text-xs sm:text-sm leading-relaxed">
            {/* Section 1 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                1. Introduction &amp; Scope
              </h2>
              <p>
                {SITE_CONFIG.parentCompany.name} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), operating from Kilimani, Nairobi, provides the Servora multi-tenant hospitality SaaS platform and hardware procurement services. This Privacy Policy outlines how we collect, use, store, and safeguard information when you access our software, point-of-sale terminals, and official websites.
              </p>
            </article>

            {/* Section 2 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                2. Information We Collect
              </h2>
              <p className="mb-2">
                To deliver secure and efficient hospitality management, we may collect the following categories of information:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong className="text-servora-navy">Merchant &amp; Account Data:</strong> Business name, contact person, email address, phone numbers, and tax PIN details provided during onboarding or subscription.
                </li>
                <li>
                  <strong className="text-servora-navy">Operational Data:</strong> Menu items, pricing, staff usernames, table layouts, and inventory stock levels configured within Servora.
                </li>
                <li>
                  <strong className="text-servora-navy">Transaction &amp; Payment Data:</strong> Records of sales, split bills, and mobile money transaction identifiers (such as Safaricom M-Pesa Daraja callback confirmations). Note: We do not store raw customer mobile wallet PINs.
                </li>
                <li>
                  <strong className="text-servora-navy">Technical Logs:</strong> Device type, terminal IP addresses, browser info, and diagnostic logs to ensure offline sync reliability and system security.
                </li>
              </ul>
            </article>

            {/* Section 3 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                3. How We Use Your Information
              </h2>
              <p className="mb-2">
                We utilize collected data strictly for operational and enhancement purposes, including:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Providing core POS checkout, KDS kitchen dispatch, and inventory deduction services.</li>
                <li>Processing and verifying M-Pesa STK push payments and shift reconciliations.</li>
                <li>Providing technical support, hardware procurement configuration, and system updates.</li>
                <li>Ensuring compliance with local tax reporting standards and statutory regulations in Kenya.</li>
              </ul>
            </article>

            {/* Section 4 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                4. Data Security &amp; Multi-Tenant Isolation
              </h2>
              <p>
                We implement robust administrative, physical, and technical safeguards—including encrypted databases and strict multi-tenant data isolation hosted via secure cloud infrastructure—to prevent unauthorized access, alteration, or disclosure of your hospitality records.
              </p>
            </article>

            {/* Section 5 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">
                5. Data Sharing &amp; Third Parties
              </h2>
              <p>
                We do not sell, trade, or rent your business or customer data to third parties. Data is only shared with trusted partners essential to our service delivery, such as authorized payment gateways (Safaricom M-Pesa Daraja API) and secure cloud hosting providers, under strict confidentiality agreements.
              </p>
            </article>

            {/* Section 6 */}
            <article>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">6. Contact Us</h2>
              <p className="mb-3">
                If you have any questions, concerns, or requests regarding this Privacy Policy or your data rights, please contact our compliance team:
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
                Questions on Data Security?
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Speak with Our Technical Team
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Our Kilimani office is ready to address any security audits or enterprise integration requirements.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Contact Support via WhatsApp
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}