// apps/web/lib/seo.ts
import type { Metadata } from 'next';

export const SITE_CONFIG = {
  name: 'Servora',
  fullName: 'Servora — Hotel, Restaurant & Hospitality Management System',
  tagline: 'Simplify Service. Grow Smarter.',
  url: 'https://servora.mavoratechnologies.com',
  parentCompany: {
    name: 'Mavora Technologies Ltd',
    url: 'https://mavoratechnologies.com',
    telephone: '+254795707823',
    displayPhone: '+254 795 707 823',
    email: 'info@mavoratechnologies.com',
    address: {
      streetAddress: 'Concert House, Wood Avenue, Kilimani',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
    geo: {
      latitude: -1.2921,
      longitude: 36.8219,
    },
  },
  canonicalBrandDefinition:
    'Servora is a hotel, restaurant and hospitality management platform developed by Mavora Technologies. It helps hospitality businesses streamline daily operations through integrated management of sales, orders, reservations, inventory, procurement, payments, staff and business reporting.',
  ogImage: '/android-chrome-512x512.jpg',
  locale: 'en_KE',
} as const;

export interface PageSeoInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
}: PageSeoInput): Metadata {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl =
    normalizedPath === '/' ? SITE_CONFIG.url : `${SITE_CONFIG.url}${normalizedPath}`;

  return {
    title,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      title,
      description,
      images: [
        {
          url: SITE_CONFIG.ogImage,
          width: 512,
          height: 512,
          alt: `${title} — ${SITE_CONFIG.name} by ${SITE_CONFIG.parentCompany.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SITE_CONFIG.ogImage],
    },
  };
}