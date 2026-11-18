// apps/web/app/resources/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hospitality & Restaurant Management Guides | Servora Resources',
  description:
    'Expert guides, operational playbooks, and best practices for hotel F&B, restaurant POS systems, M-Pesa integration, recipe costing, and KDS workflow optimization in Kenya and East Africa.',
  path: '/resources',
  keywords: [
    'Restaurant Management Guides Kenya',
    'How to Choose Restaurant POS',
    'Restaurant Food Costing Guides',
    'Servora Hospitality Resources',
  ],
});

const ARTICLES = [
  {
    slug: 'best-restaurant-pos-system-kenya',
    title: 'How to Choose the Best Restaurant POS System in Kenya',
    category: 'POS & Technology',
    readTime: '6 min read',
    excerpt:
      'Discover what to look for when selecting a restaurant Point of Sale system in Nairobi—including M-Pesa Daraja integration, offline resilience, and KRA eTIMS invoice compatibility.',
    date: '2026-03-01',
  },
  {
    slug: 'restaurant-recipe-costing-food-cost',
    title: 'How Restaurants Can Control Food Costs with Recipe BOMs',
    category: 'Inventory & Margins',
    readTime: '8 min read',
    excerpt:
      'Learn how automated recipe Bill of Materials (BOM) stock deduction and wastage tracking eliminate shrinkage and protect your restaurant gross profit margins.',
    date: '2026-02-18',
  },
  {
    slug: 'why-kitchen-display-system-outperforms-paper',
    title: 'Why Kitchen Display Systems (KDS) Outperform Paper Tickets',
    category: 'Kitchen Operations',
    readTime: '5 min read',
    excerpt:
      'Explore how digital KDS screen routing by station, color-coded SLA timers, and staff execution tracking eliminate lost tickets and speed up order turnaround times.',
    date: '2026-02-05',
  },
];

export default function ResourcesPage() {
  const articlesSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Servora Hospitality & Restaurant Management Guides',
    url: `${SITE_CONFIG.url}/resources`,
    publisher: {
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
    hasPart: ARTICLES.map((art) => ({
      '@type': 'Article',
      headline: art.title,
      description: art.excerpt,
      datePublished: art.date,
      author: {
        '@type': 'Organization',
        name: SITE_CONFIG.parentCompany.name,
      },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Resources', path: '/resources' },
          ]),
          articlesSchema,
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
                <li className="font-bold text-servora-navy">Resources &amp; Guides</li>
              </ol>
            </nav>

            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Knowledge Base &amp; Industry Playbooks
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Hospitality &amp; Restaurant Management{' '}
              <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                Expert Guides
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Practical insights on restaurant POS technology, M-Pesa payment workflows, recipe inventory costing, and kitchen display system optimization in Kenya and East Africa.
            </p>
          </div>
        </section>

        {/* --- ARTICLES GRID --- */}
        <section className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {ARTICLES.map((art) => (
              <article
                key={art.slug}
                className="flex flex-col justify-between rounded-2xl bg-white p-8 border border-gray-200 shadow-sm transition-all hover:border-servora-core/50 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-servora-deepTeal mb-4">
                    <span className="font-bold text-servora-core uppercase tracking-wider text-[10px] bg-servora-pale px-2.5 py-1 rounded-md">
                      {art.category}
                    </span>
                    <span>{art.readTime}</span>
                  </div>
                  <h2 className="text-lg font-bold text-servora-navy mb-3 leading-snug">
                    {art.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed mb-6">
                    {art.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-400">{art.date}</span>
                  <Link
                    href="/contact"
                    className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                  >
                    Read Playbook &rarr;
                  </Link>
                </div>
              </article>
            ))}
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
                Ready to Upgrade Your Restaurant Operations?
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Contact our Kilimani team via WhatsApp to discuss your venue’s specific operational needs.
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