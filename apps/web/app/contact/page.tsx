// apps/web/app/contact/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import ContactInquiryForm from '../../components/marketing/ContactInquiryForm';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Servora Sales & Hospitality Consultation | Nairobi, Kenya',
  description:
    'Book a live demo or hospitality software consultation with Mavora Technologies Ltd in Kilimani, Nairobi. Connect directly via WhatsApp, phone, or email for Servora POS & operations.',
  path: '/contact',
  keywords: [
    'Contact Servora Kenya',
    'Hospitality Software Consultation Nairobi',
    'Book Restaurant POS Demo Kenya',
    'Mavora Technologies Contact',
  ],
});

export default function ContactPage() {
  const contactPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Servora by Mavora Technologies Ltd',
    url: `${SITE_CONFIG.url}/contact`,
    mainEntity: {
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
          contactPageSchema,
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- PAGE HEADER HERO --- */}
        <section className="relative overflow-hidden pt-12 pb-12 sm:pt-16 sm:pb-16 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">Contact &amp; Demo Request</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Mavora Technologies Support &amp; Sales
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl">
              Get in Touch with Our Hospitality Team
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Have questions about Servora POS, Safaricom M-Pesa Daraja integration, multi-branch deployment, or POS hardware setups? Connect with our Nairobi specialists.
            </p>
          </div>
        </section>

        {/* --- CONTACT CONTENT SECTION --- */}
        <section className="py-16 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Contact Info Cards */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* HQ Address Card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-servora-navy mb-1">HQ Address</h2>
                <p className="text-xs font-semibold text-servora-navy">
                  {SITE_CONFIG.parentCompany.name}
                </p>
                <p className="text-xs text-servora-deepTeal leading-relaxed mt-0.5">
                  Concert House, Wood Avenue,
                  <br />
                  Kilimani, Nairobi, Kenya
                </p>
              </div>

              {/* Direct WhatsApp & Phone Desk Card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-servora-navy mb-1">
                  WhatsApp &amp; Call Desk
                </h2>
                <a
                  href={`https://wa.me/254795707823?text=${encodeURIComponent(
                    'Hello Mavora Technologies, I would like to learn more about Servora for my hospitality business.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-700 hover:underline block mb-1"
                >
                  Chat Directly on WhatsApp &rarr;
                </a>
                <a
                  href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                  className="text-sm font-mono font-bold text-servora-core hover:underline block mb-2"
                >
                  {SITE_CONFIG.parentCompany.displayPhone}
                </a>
                <p className="text-[11px] text-servora-deepTeal leading-relaxed">
                  Available Monday – Friday
                  <br />
                  <span className="font-semibold text-servora-navy">(8:30 AM – 5:00 PM EAT)</span>
                </p>
              </div>

              {/* Email Card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-servora-navy mb-1">Email Us</h2>
                <a
                  href={`mailto:${SITE_CONFIG.parentCompany.email}`}
                  className="text-sm font-medium text-servora-core hover:underline block mb-1"
                >
                  {SITE_CONFIG.parentCompany.email}
                </a>
                <p className="text-[11px] text-servora-deepTeal leading-relaxed">
                  Primary channel for technical RFPs &amp; procurement briefs.
                </p>
              </div>
            </div>

            {/* Interactive WhatsApp Lead Routing Form */}
            <div className="lg:col-span-2 p-8 sm:p-10 rounded-2xl bg-white border border-gray-100 shadow-md">
              <ContactInquiryForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}