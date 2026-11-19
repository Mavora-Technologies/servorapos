// apps/web/app/resources/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { RESOURCE_ARTICLES, getArticleBySlug } from '@/lib/resources/articles';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return RESOURCE_ARTICLES.filter((a) => a.published).map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return buildPageMetadata({
      title: 'Resource Not Found | Servora',
      description: 'The requested hospitality guide could not be found.',
      path: `/resources/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${article.title} | Servora Resources`,
    description: article.excerpt,
    path: `/resources/${article.slug}`,
    keywords: article.keywords,
  });
}

export default async function ResourceArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = RESOURCE_ARTICLES.filter(
    (item) => item.slug !== article.slug && item.published
  );

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.coverImage,
    datePublished: article.date,
    mainEntityOfPage: `${SITE_CONFIG.url}/resources/${article.slug}`,
    author: {
      '@type': 'Organization',
      name: SITE_CONFIG.parentCompany.name,
    },
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
            { name: 'Resources', path: '/resources' },
            { name: article.title, path: `/resources/${article.slug}` },
          ]),
          articleSchema,
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* Article Header */}
        <section className="pt-10 pb-12 sm:pt-14 sm:pb-16 w-full bg-white border-b border-gray-200/70 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <nav aria-label="Breadcrumb" className="mb-5 text-xs text-servora-deepTeal">
              <ol className="inline-flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-servora-core font-semibold">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li>
                  <Link href="/resources" className="hover:text-servora-core font-semibold">
                    Resources
                  </Link>
                </li>
                <li>/</li>
                <li className="font-bold text-servora-navy">{article.category}</li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
              <span className="rounded-full bg-servora-core/10 px-3 py-1 font-bold text-servora-core uppercase tracking-wider text-[10px]">
                {article.category}
              </span>
              <time dateTime={article.date} className="font-mono text-gray-500">
                {article.date}
              </time>
              <span className="text-gray-300">&bull;</span>
              <span className="text-servora-deepTeal font-semibold">{article.readTime}</span>
            </div>

            <h1 className="text-[clamp(1.75rem,3.4vw,2.9rem)] font-extrabold tracking-tight text-servora-navy leading-[1.15]">
              {article.title}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-servora-deepTeal leading-relaxed">
              {article.excerpt}
            </p>
          </div>
        </section>

        {/* Article Body + Sidebar TOC */}
        <section className="py-12 sm:py-16 w-full px-4 sm:px-8 lg:px-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Main Editorial Content */}
            <article className="lg:col-span-8 rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-10 shadow-xs space-y-10">
              {/* Cover Image */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-servora-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.coverImage}
                  alt={article.coverAlt}
                  className="h-full w-full object-cover object-center"
                />
              </div>

              {/* Key Takeaways Box */}
              <div className="rounded-2xl bg-servora-pale border border-servora-core/20 p-6">
                <h2 className="text-sm font-extrabold text-servora-navy uppercase tracking-wider mb-3">
                  Key Takeaways
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm text-servora-deepTeal">
                  {article.keyTakeaways.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-servora-teal mt-2 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sections */}
              {article.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-servora-navy tracking-tight">
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((p) => (
                    <p
                      key={p}
                      className="text-sm sm:text-base text-servora-deepTeal leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-2 pt-2 text-xs sm:text-sm text-servora-navy font-medium">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-servora-core mt-1.5 flex-shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {/* Related Servora Feature Links */}
              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-sm font-extrabold text-servora-navy uppercase tracking-wider mb-4">
                  Explore Related Servora Capabilities
                </h3>
                <div className="flex flex-wrap gap-3">
                  {article.relatedFeatureLinks.map((link) => (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-servora-pale px-4 py-2.5 text-xs font-bold text-servora-core hover:bg-servora-core hover:text-white transition-colors"
                    >
                      {link.label} &rarr;
                    </Link>
                  ))}
                </div>
              </div>
            </article>

            {/* Right Sidebar: TOC & Demo Card */}
            <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              <div className="rounded-2xl bg-white border border-gray-200/80 p-6 shadow-xs">
                <h2 className="text-xs font-extrabold text-servora-navy uppercase tracking-wider mb-3">
                  In This Guide
                </h2>
                <ul className="space-y-2.5 text-xs font-semibold text-servora-deepTeal">
                  {article.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="hover:text-servora-core transition-colors"
                      >
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-6 text-white shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-widest text-servora-teal">
                  Servora by Mavora Technologies
                </span>
                <h3 className="text-lg font-extrabold mt-2 leading-snug">
                  See These Workflows Live in Servora
                </h3>
                <p className="text-xs text-gray-200 mt-2 leading-relaxed">
                  Book a personalized walkthrough of Servora POS, Kitchen Display Systems, M-Pesa Daraja, and BOM recipe inventory.
                </p>
                <Link
                  href="/contact"
                  className="mt-5 inline-flex w-full h-11 items-center justify-center rounded-xl bg-white text-xs font-bold text-servora-navy hover:bg-servora-pale transition-colors"
                >
                  Request a Live Demo &rarr;
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* Related Guides */}
        <section className="py-14 w-full bg-white border-t border-gray-200/70 px-4 sm:px-8 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-servora-navy">
                Related Hospitality Guides
              </h2>
              <Link href="/resources" className="text-xs font-bold text-servora-core hover:underline">
                All Resources &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles.map((item) => (
                <article
                  key={item.slug}
                  className="group rounded-2xl bg-servora-pale border border-gray-200/80 overflow-hidden flex flex-col justify-between hover:border-servora-core transition-colors"
                >
                  <div>
                    <div className="relative h-40 w-full overflow-hidden bg-servora-navy">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.coverImage}
                        alt={item.coverAlt}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-servora-navy/85 via-servora-navy/25 to-transparent" />
                      <span className="absolute bottom-3 left-4 rounded-full bg-servora-navy/75 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/15">
                        {item.category} &bull; {item.readTime}
                      </span>
                    </div>
                    <div className="p-6 pb-4">
                      <h3 className="text-base font-extrabold text-servora-navy">
                        <Link href={`/resources/${item.slug}`} className="hover:text-servora-core">
                          {item.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-servora-deepTeal mt-2 leading-relaxed">
                        {item.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-2">
                    <Link
                      href={`/resources/${item.slug}`}
                      className="text-xs font-bold text-servora-core hover:underline inline-block"
                    >
                      Read Article &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}