// apps/web/app/pricing/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import PricingPlansClient from '../../components/marketing/PricingPlansClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Restaurant & Hospitality Software Pricing in Kenya (KES) | Servora',
  description:
    'Transparent monthly, 6-month, and annual KES pricing for Servora hospitality and restaurant management software by Mavora Technologies. Plans starting from KSh 2,500/month.',
  path: '/pricing',
  keywords: [
    'Restaurant POS Pricing Kenya',
    'Hospitality Software Pricing KES',
    'Servora Pricing Plans',
    'Hotel and Restaurant Software Pricing Nairobi',
  ],
});

const PRICING_FAQS = [
  {
    question: 'How much does Servora restaurant and hospitality software cost in Kenya?',
    answer:
      'Servora offers four transparent KES subscription tiers: Starter (KSh 2,500/month) for single-outlet cafés, Business (KSh 4,500/month) with Kitchen Display System and M-Pesa Daraja integration, Professional (KSh 8,000/month) with recipe costing and waste tracking, and Enterprise (KSh 15,000/month) for multi-branch hospitality groups.',
  },
  {
    question: 'Do annual subscriptions include a discount?',
    answer:
      'Yes. Paying annually bills at 10x the monthly rate (saving approximately 17%, equivalent to two months free), while bi-annual 6-month billing is priced at 5x the monthly rate.',
  },
  {
    question: 'Can Mavora Technologies supply POS terminals and thermal printers with our software plan?',
    answer:
      'Yes. Mavora Technologies provides turnkey POS hardware procurement, pre-configuration, and on-site installation across Kenya alongside any Servora software plan.',
  },
];

export default function PricingPage() {
  const offersSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_CONFIG.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web-based, Cloud',
    url: `${SITE_CONFIG.url}/pricing`,
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter — Single Outlet',
        price: '2500',
        priceCurrency: 'KES',
      },
      {
        '@type': 'Offer',
        name: 'Business — Growing Restaurant',
        price: '4500',
        priceCurrency: 'KES',
      },
      {
        '@type': 'Offer',
        name: 'Professional — Advanced Venue',
        price: '8000',
        priceCurrency: 'KES',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise — Hospitality Group',
        price: '15000',
        priceCurrency: 'KES',
      },
    ],
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
          offersSchema,
          buildFaqSchema(PRICING_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- HERO HEADER --- */}
        <section className="relative overflow-hidden pt-12 pb-8 sm:pt-16 sm:pb-10 w-full px-4 sm:px-8 lg:px-16 bg-white">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-servora-deepTeal">
              <ol className="inline-flex items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">Pricing Plans</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Transparent KES SaaS Plans
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Hotel &amp; Restaurant Software Pricing for Every Scale
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Choose the ideal plan for your independent café, restaurant, bar, or multi-branch hospitality group. Upgrade seamlessly as your outlets expand.
            </p>
          </div>
        </section>

        {/* --- INTERACTIVE BILLING TOGGLE & TIERS --- */}
        <PricingPlansClient />

        {/* --- PRICING FAQS --- */}
        <section className="py-16 w-full bg-white border-t border-gray-100 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-servora-teal uppercase tracking-widest mb-2 block">
                Flexible &amp; Transparent
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-servora-navy">
                Frequently Asked Pricing Questions
              </h2>
            </div>

            <div className="space-y-4 mb-10">
              {PRICING_FAQS.map((faq) => (
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Speak with Sales via WhatsApp
              </Link>
              <Link
                href="/hardware-pos"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-7 text-sm font-semibold text-servora-navy hover:border-servora-core"
              >
                View POS Hardware Setup
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}