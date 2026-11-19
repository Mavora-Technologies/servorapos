// apps/web/lib/resources/articles.ts

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ResourceArticle {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  date: string;
  published: boolean;
  coverImage: string;
  coverAlt: string;
  badgeLabel: string;
  keywords: string[];
  keyTakeaways: string[];
  sections: ArticleSection[];
  relatedFeatureLinks: { label: string; href: string }[];
}

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    slug: 'best-restaurant-pos-system-kenya',
    title: 'How to Choose the Best Restaurant POS System in Kenya',
    category: 'POS & Technology',
    readTime: '6 min read',
    excerpt:
      'Discover what to look for when selecting a restaurant Point of Sale system in Nairobi—including M-Pesa Daraja integration, offline resilience, and KRA eTIMS invoice compatibility.',
    date: '2026-03-01',
    published: true,
    coverImage: '/images/resources/restaurant-pos-kenya.png',
    coverAlt:
      'Customer completing a Lipa na M-Pesa payment at a Kenyan restaurant POS terminal with Mavora Technologies thermal receipt printer, KRA eTIMS readiness, and offline resilience',
    badgeLabel: 'POS Buyer’s Guide',
    keywords: [
      'POS',
      'M-Pesa Daraja',
      'STK Push',
      'KRA eTIMS',
      'Offline POS',
      'Nairobi',
      'Kenya',
      'Hardware',
    ],
    keyTakeaways: [
      'Prioritize native Safaricom M-Pesa Daraja STK Push and C2B Till callback reconciliation to eliminate manual phone checking.',
      'Verify offline-resilient local queueing so service continues during temporary internet drops.',
      'Ensure built-in support for Kenyan Shilling (KES), 16% VAT, 2% Catering Levy, and KRA eTIMS fiscal invoicing.',
      'Choose a unified platform where POS sales automatically trigger Kitchen Display (KDS) routing and recipe inventory deduction.',
    ],
    sections: [
      {
        id: 'mpesa-daraja-reconciliation',
        heading: '1. Native Safaricom M-Pesa Daraja Integration',
        paragraphs: [
          'In Kenya, mobile money accounts for a major share of hospitality transactions. A basic POS that only records "M-Pesa" as a manual tender forces cashiers to read confirmation messages off a till phone—creating bottlenecks at peak hours and opening the door to unverified slips.',
          'Look for a POS with native Safaricom Daraja API integration that triggers instant STK Push prompts directly to the guest’s phone and automatically matches C2B Till or Paybill callbacks against the open check.',
        ],
        bullets: [
          'Instant STK Push payment requests initiated from the POS register',
          'Automated C2B callback matching that closes bills without manual code entry',
          'Split-tender support combining M-Pesa, card, and cash on one receipt',
        ],
      },
      {
        id: 'offline-resilience',
        heading: '2. Offline Survivability & Local Queueing',
        paragraphs: [
          'Cloud-only browser tills that freeze whenever fibre or 4G fluctuates can halt dinner service. An enterprise hospitality POS should pair cloud synchronization with local terminal queueing (such as local SQLite storage) so orders and receipts continue processing locally and sync automatically once connectivity returns.',
        ],
      },
      {
        id: 'kra-etims-tax-readiness',
        heading: '3. Kenyan Tax Rules & KRA eTIMS Readiness',
        paragraphs: [
          'Hospitality operators in Kenya must manage configurable tax structures including 16% VAT and the 2% Tourism / Catering Levy alongside KRA eTIMS fiscal invoicing requirements. Confirm that your POS handles tax breakdowns cleanly on thermal receipts and end-of-day Z-reports.',
        ],
      },
      {
        id: 'connected-operations',
        heading: '4. Connected Kitchen, Inventory & Multi-Branch Control',
        paragraphs: [
          'A register alone cannot protect your margins. The strongest restaurant POS platforms connect every confirmed order directly to multi-station Kitchen Display Systems (KDS), Bill of Materials (BOM) recipe stock deduction, blind cashier shift custody, and real-time executive reporting.',
        ],
        bullets: [
          'Automatic ticket splitting to Grill, Bar, Cold Pantry, and Expediter screens',
          'Gram-level ingredient deduction linked to every menu item sold',
          'Local Nairobi onboarding, thermal printer setup, and ongoing technical support',
        ],
      },
    ],
    relatedFeatureLinks: [
      { label: 'Explore Servora POS & Platform Features', href: '/features' },
      { label: 'Kenya & East Africa Payment Hub', href: '/hospitality-software-kenya' },
      { label: 'Compatible POS Hardware & Printers', href: '/hardware-pos' },
    ],
  },
  {
    slug: 'restaurant-recipe-costing-food-cost',
    title: 'How Restaurants Can Control Food Costs with Recipe BOMs',
    category: 'Inventory & Margins',
    readTime: '8 min read',
    excerpt:
      'Learn how automated recipe Bill of Materials (BOM) stock deduction and wastage tracking eliminate shrinkage and protect your restaurant gross profit margins.',
    date: '2026-02-18',
    published: true,
    coverImage: '/images/resources/recipe-bom-food-cost.png',
    coverAlt:
      'Chef preparing ingredients in a kitchen beside a Recipe BOM screen showing ingredient quantities, wastage percentages, automated stock deduction, and food cost variance in KSh',
    badgeLabel: 'Inventory & Costing',
    keywords: [
      'Recipe BOM',
      'Food Cost',
      'Inventory',
      'Wastage',
      'Margins',
      'Unit Conversion',
      'Stock Control',
    ],
    keyTakeaways: [
      'Map every menu dish and cocktail to a Bill of Materials (BOM) with exact ingredient quantities and unit conversions.',
      'Configure realistic wastage percentages so theoretical stock usage reflects real kitchen prep yields.',
      'Automate stock deduction at the moment of POS sale to maintain live storage bin balances.',
      'Run blind physical cycle counts to compare theoretical versus actual food cost and isolate shrinkage early.',
    ],
    sections: [
      {
        id: 'what-is-recipe-bom',
        heading: '1. What Is a Restaurant Bill of Materials (BOM)?',
        paragraphs: [
          'A Bill of Materials (BOM) breaks every sellable menu item down into its exact raw ingredients, measurement units, and preparation yields. Instead of waiting until an end-of-month stocktake to discover missing proteins or spirits, a BOM links front-of-house sales directly to back-of-house stockrooms.',
        ],
      },
      {
        id: 'unit-conversions-wastage',
        heading: '2. Handling Unit Conversions & Wastage Percentages',
        paragraphs: [
          'Restaurants purchase ingredients in bulk units (kilograms, liters, crates) but plate them in portion units (grams, milliliters, pieces). Accurate recipe costing requires automatic unit conversions alongside configured wastage percentages for trimming, peeling, and cooking loss.',
        ],
        bullets: [
          'Automatic conversion between purchasing units (kg/L) and recipe units (g/ml)',
          'Standardized portion sizes across shifts and multiple branches',
          'Dedicated waste and spoilage logs separated from normal sales consumption',
        ],
      },
      {
        id: 'theoretical-vs-actual',
        heading: '3. Tracking Theoretical vs. Actual Food Cost',
        paragraphs: [
          'When every POS sale automatically deducts recipe ingredients, your system calculates theoretical usage in real time. Comparing that figure against blind physical cycle counts immediately reveals over-portioning, unlogged spoilage, or unrecorded transfers—giving chefs and managers actionable visibility every week rather than months later.',
        ],
      },
    ],
    relatedFeatureLinks: [
      { label: 'Explore Recipe BOM & Inventory Features', href: '/features' },
      { label: 'Bar Pour-Cost & Stock Control', href: '/solutions/bars-lounges' },
      { label: 'Request a Live Inventory Walkthrough', href: '/contact' },
    ],
  },
  {
    slug: 'why-kitchen-display-system-outperforms-paper',
    title: 'Why Kitchen Display Systems (KDS) Outperform Paper Tickets',
    category: 'Kitchen Operations',
    readTime: '5 min read',
    excerpt:
      'Explore how digital KDS screen routing by station, color-coded SLA timers, and staff execution tracking eliminate lost tickets and speed up order turnaround times.',
    date: '2026-02-05',
    published: true,
    coverImage: '/images/resources/kds-kitchen-display.png',
    coverAlt:
      'Chef using a digital Kitchen Display System (KDS) screen showing Grill, Cold Pantry, Bar, and Pastry station tickets with SLA timers',
    badgeLabel: 'Kitchen Operations',
    keywords: [
      'KDS',
      'Kitchen Display System',
      'Station Routing',
      'SLA Timers',
      'Cloud Kitchen',
      'Expediter',
    ],
    keyTakeaways: [
      'Digital KDS screens eliminate smudged, dropped, or jammed paper kitchen dockets during rush hour.',
      'Multi-station routing automatically splits a single guest check across Grill, Bar, Cold Pantry, and Pastry.',
      'Color-coded target, warning, and critical SLA timers alert chefs before orders run late.',
      'Completed ticket history provides objective speed-of-service data for kitchen optimization.',
    ],
    sections: [
      {
        id: 'limits-of-paper-dockets',
        heading: '1. Where Paper Kitchen Printers Break Down',
        paragraphs: [
          'Paper impact printers are noisy, prone to ribbon or paper jams during peak dinner rushes, and offer zero visibility once a slip is torn off the roll. If a waiter modifies an order or adds an allergy note, staff have to shout across the pass or sprint back to the kitchen.',
        ],
      },
      {
        id: 'multi-station-routing',
        heading: '2. Automated Multi-Station Ticket Routing',
        paragraphs: [
          'With a connected Kitchen Display System (KDS), a single table order is automatically split by preparation category. Steaks appear on the Grill screen, salads on Cold Pantry, cocktails at the Bar, and the full coordinated order on the Expediter screen—with backup station failover if a screen goes offline.',
        ],
        bullets: [
          'Zero manual sorting of multi-course or mixed food-and-bar orders',
          'Instant visibility of modifiers, allergies, and course firing instructions',
          'Synchronized expediter view so all dishes for a table leave the pass together',
        ],
      },
      {
        id: 'sla-timers-audit',
        heading: '3. Live SLA Timers & Speed-of-Service Analytics',
        paragraphs: [
          'Every digital ticket displays a live elapsed timer that shifts through target, warning, and critical thresholds. When a station bumps a completed item, Servora logs the exact preparation time and staff attribution—helping culinary leaders spot bottlenecks and maintain consistent guest service.',
        ],
      },
    ],
    relatedFeatureLinks: [
      { label: 'Cloud Kitchen & KDS Dispatch', href: '/solutions/cloud-kitchens' },
      { label: 'Explore Full Platform Features', href: '/features' },
      { label: 'Book a Live KDS Demo', href: '/contact' },
    ],
  },
];

export function getArticleBySlug(slug: string): ResourceArticle | undefined {
  return RESOURCE_ARTICLES.find((article) => article.slug === slug && article.published);
}

export function getResourceCategories(): string[] {
  return Array.from(new Set(RESOURCE_ARTICLES.map((article) => article.category)));
}