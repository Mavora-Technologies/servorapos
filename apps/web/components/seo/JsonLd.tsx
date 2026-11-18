// apps/web/components/seo/JsonLd.tsx
import { SITE_CONFIG } from '@/lib/seo';

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function getGlobalEntityGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_CONFIG.url}/#organization`,
        name: SITE_CONFIG.parentCompany.name,
        url: SITE_CONFIG.parentCompany.url,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: SITE_CONFIG.parentCompany.address.streetAddress,
          addressLocality: SITE_CONFIG.parentCompany.address.addressLocality,
          addressCountry: SITE_CONFIG.parentCompany.address.addressCountry,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: SITE_CONFIG.parentCompany.telephone,
          contactType: 'sales and customer support',
          areaServed: ['KE', 'UG', 'TZ', 'RW'],
          availableLanguage: ['English', 'Swahili'],
        },
        sameAs: [SITE_CONFIG.parentCompany.url, 'https://github.com/mavoratech'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_CONFIG.url}/#website`,
        url: SITE_CONFIG.url,
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.canonicalBrandDefinition,
        publisher: {
          '@id': `${SITE_CONFIG.url}/#organization`,
        },
        inLanguage: 'en-KE',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_CONFIG.url}/#software`,
        name: SITE_CONFIG.name,
        alternateName: 'Servora Hospitality & Restaurant Management Platform',
        operatingSystem: 'Web-based, Cloud, Windows, iOS, Android',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Hotel, Restaurant & Hospitality Management Software',
        description: SITE_CONFIG.canonicalBrandDefinition,
        url: SITE_CONFIG.url,
        provider: {
          '@id': `${SITE_CONFIG.url}/#organization`,
        },
        creator: {
          '@id': `${SITE_CONFIG.url}/#organization`,
        },
        areaServed: [
          { '@type': 'Country', name: 'Kenya' },
          { '@type': 'Place', name: 'East Africa' },
        ],
        featureList: [
          'Point of Sale (POS) & Split Billing',
          'Kitchen Display System (KDS) & Station Routing',
          'Table, Floor Plan, Reservations & Waitlist Management',
          'Recipe Costing, Bill of Materials (BOM) & Inventory Control',
          'Supplier Procurement, Purchase Orders & Goods Received Notes',
          'Safaricom M-Pesa Daraja STK Push & C2B Reconciliation',
          'KRA eTIMS Fiscal Invoicing & Cashier Shift Reconciliation',
          'Multi-Branch Operations, Staff Scheduling & Attendance',
          'Executive Sales, Food Cost & SLA Analytics',
        ],
      },
    ],
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.path === '/' ? SITE_CONFIG.url : `${SITE_CONFIG.url}${item.path}`,
    })),
  };
}

export function buildFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}