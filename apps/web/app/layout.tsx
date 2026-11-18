// apps/web/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SITE_CONFIG } from '@/lib/seo';
import { JsonLd, getGlobalEntityGraph } from '@/components/seo/JsonLd';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  themeColor: '#041F56',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: 'Hotel & Restaurant Management System | Servora Kenya',
    template: '%s | Servora',
  },
  description:
    'Manage hotel and restaurant operations with Servora. Streamline reservations, POS sales, orders, inventory, payments and reporting through one integrated hospitality platform.',
  applicationName: SITE_CONFIG.name,
  authors: [{ name: SITE_CONFIG.parentCompany.name, url: SITE_CONFIG.parentCompany.url }],
  creator: SITE_CONFIG.parentCompany.name,
  publisher: SITE_CONFIG.parentCompany.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    'geo.region': 'KE',
    'geo.placename': 'Nairobi',
    'geo.position': '-1.2921;36.8219',
    ICBM: '-1.2921, 36.8219',
  },
  robots: {
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
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    title: 'Hotel & Restaurant Management System | Servora Kenya',
    description:
      'Simplify hotel and restaurant operations with Servora by Mavora Technologies.',
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 512,
        height: 512,
        alt: 'Servora Hotel & Restaurant Management Platform by Mavora Technologies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hotel & Restaurant Management System | Servora',
    description:
      'Integrated hotel and restaurant management software by Mavora Technologies.',
    images: [SITE_CONFIG.ogImage],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <JsonLd data={getGlobalEntityGraph()} />
      </head>
      <body
        className={`${inter.className} min-h-full flex flex-col bg-servora-pale text-servora-navy text-sm selection:bg-servora-bright selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}