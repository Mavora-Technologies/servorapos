import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Configure Inter (Google Font) for a standard corporate SaaS aesthetic
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#041F56", // Servora Primary Navy
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://servora.co"),
  title: {
    template: "%s | Servora POS by Mavora Technologies",
    default: "Servora POS | Best Restaurant Management & POS Software in Kenya",
  },
  description: "Servora is a premium cloud-based restaurant operations and Point of Sale (POS) platform by Mavora Technologies[cite: 1]. Seamlessly manage multi-branch orders, inventory, recipe costing, KDS, and M-Pesa payments in Kenya[cite: 1].",
  keywords: [
    // Local & Regional High-Intent Keywords (Kenya / East Africa)
    "Best restaurant POS in Kenya",
    "Point of sale system Nairobi",
    "M-Pesa POS integration for restaurants",
    "Restaurant management software Kenya",
    "Bar and restaurant POS software Nairobi",
    "Cloud kitchen software Kenya",
    "Hotel POS system East Africa",
    // Core Functional Keywords
    "Multi-branch restaurant software",
    "Kitchen display system KDS",
    "Recipe and food costing software",
    "Offline-aware restaurant POS",
    "Inventory management for restaurants",
    "Table and floor management POS",
    "Cashier shift reconciliation software",
    // Brand & Corporate Keywords
    "Mavora Technologies",
    "Servora POS",
    "Servora restaurant platform"
  ],
  authors: [{ name: "Mavora Technologies", url: "https://servora.co" }],
  creator: "Mavora Technologies",
  publisher: "Mavora Technologies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Advanced GEO & Regional Targeting Tags for Search Engines & AI Crawlers
  other: {
    "geo.region": "KE",
    "geo.placename": "Nairobi",
    "geo.position": "-1.2921;36.8219",
    "ICBM": "-1.2921, 36.8219",
    "distribution": "global",
    "rating": "general",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Servora POS | Simplify Service. Grow Smarter.",
    description: "The premium restaurant operations and POS platform for modern hospitality businesses in Kenya and beyond[cite: 1]. Featuring M-Pesa integration and real-time inventory tracking.",
    url: "https://servora.co",
    siteName: "Servora POS",
    images: [
      {
        url: "/android-chrome-512x512.jpg", 
        width: 512,
        height: 512,
        alt: "Servora POS Logo - Mavora Technologies[cite: 1]",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Servora POS | Simplify Service. Grow Smarter.",
    description: "The premium restaurant operations and POS platform for modern hospitality businesses built by Mavora Technologies[cite: 1].",
    images: ["/android-chrome-512x512.jpg"], 
  },
  icons: {
    icon: [
      { url: "/favicon.ico" }, 
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }, 
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }, 
    ],
    apple: [
      { url: "/apple-touch-icon.png" }, 
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }, 
      { url: "/android-chrome-512x512.jpg", sizes: "512x512", type: "image/jpeg" }, 
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Advanced Schema.org JSON-LD for GEO (Generative Engine Optimization) & Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Servora POS",
        "operatingSystem": "Cloud-based, Web, PWA, iOS, Android",
        "applicationCategory": "BusinessApplication",
        "genre": "Restaurant Point of Sale & Operations Management Software",
        "description": "A premium multi-tenant restaurant operations and POS platform built by Mavora Technologies, featuring M-Pesa integration, inventory tracking, kitchen display system (KDS), and offline resilience[cite: 1].",
        "softwareVersion": "1.0",
        "releaseNotes": "https://servora.co/changelog",
        "countriesSupported": "KE, Global",
        "provider": {
          "@type": "Organization",
          "name": "Mavora Technologies",
          "url": "https://servora.co",
          "logo": "https://servora.co/logo.png",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Nairobi",
            "addressCountry": "KE"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "Customer Support",
            "areaServed": "KE",
            "availableLanguage": ["English", "Swahili"]
          }
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "KES",
          "lowPrice": "0",
          "offerCount": "3"
        }
      },
      {
        "@type": "LocalBusiness",
        "name": "Mavora Technologies / Servora POS",
        "image": "https://servora.co/logo.png",
        "@id": "https://servora.co",
        "url": "https://servora.co",
        "telephone": "+254700000000",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Nairobi",
          "addressCountry": "KE"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": -1.2921,
          "longitude": 36.8219
        },
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ],
          "opens": "00:00",
          "closes": "23:59"
        },
        "sameAs": [
          "https://github.com/mavoratech"
        ]
      }
    ]
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-servora-pale text-servora-navy text-sm selection:bg-servora-bright selection:text-white`}>
        {children}
      </body>
    </html>
  );
}