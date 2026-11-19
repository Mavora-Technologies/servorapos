// apps/web/lib/pricing/plans.ts

export type BillingInterval = 'monthly' | 'biannual' | 'annual';

export interface BillingOption {
  id: BillingInterval;
  label: string;
  shortNote: string;
  multiplier: number;
  monthsCovered: number;
  savingsBadge?: string;
  summaryText: string;
}

export interface PricingPlan {
  id: 'starter' | 'business' | 'professional' | 'enterprise';
  name: string;
  monthlyPrice: number;
  badge?: string;
  recommended?: boolean;
  bestFor: string;
  description: string;
  features: string[];
  ctaLabel: string;
}

export interface ComparisonRow {
  feature: string;
  starter: boolean;
  business: boolean;
  professional: boolean;
  enterprise: boolean;
}

export interface ComparisonCategory {
  category: string;
  rows: ComparisonRow[];
}

export interface PricingFaq {
  question: string;
  answer: string;
}

export const BILLING_OPTIONS: BillingOption[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    shortNote: 'Pay monthly',
    multiplier: 1,
    monthsCovered: 1,
    summaryText: 'Flexible month-to-month billing in Kenyan Shillings (KES).',
  },
  {
    id: 'biannual',
    label: 'Every 6 Months',
    shortNote: 'Pay twice a year',
    multiplier: 5,
    monthsCovered: 6,
    savingsBadge: '1 Month Free (~16.7% off)',
    summaryText: 'Six-month billing is priced at 5x the monthly rate — saving one month free (~16.7%).',
  },
  {
    id: 'annual',
    label: 'Annually',
    shortNote: 'Best long-term value',
    multiplier: 10,
    monthsCovered: 12,
    savingsBadge: '2 Months Free (~17% off)',
    summaryText: 'Annual billing is priced at 10x the monthly rate — saving approximately 17% (two months free).',
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 2500,
    bestFor: 'Independent cafés & single-outlet eateries',
    description:
      'Essential POS, order management, and daily sales reporting for single-outlet businesses beginning their digital transformation.',
    features: [
      'Essential POS operations & checkout',
      'Sales and order management',
      'Menu item & category configuration',
      'Basic inventory tracking',
      'Cashier drawer & shift operations',
      'Daily sales & tender reporting',
    ],
    ctaLabel: 'Get Started with Starter',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 4500,
    bestFor: 'Growing restaurants & busy cafés',
    description:
      'Connected front-of-house and kitchen workflows with Kitchen Display Systems (KDS) and Safaricom M-Pesa Daraja integration.',
    features: [
      'Everything included in Starter',
      'Kitchen Display System (KDS)',
      'Multi-station kitchen order routing',
      'Safaricom M-Pesa Daraja integration',
      'Table & dining service workflows',
      'Operational performance reporting',
    ],
    ctaLabel: 'Choose Business',
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 8000,
    badge: 'Recommended',
    recommended: true,
    bestFor: 'Established restaurants, bars & hotels',
    description:
      'Stronger operational and financial control with recipe Bills of Materials (BOM), ingredient-level stock deduction, and food-cost tracking.',
    features: [
      'Everything included in Business',
      'Recipe costing & Bill of Materials (BOM)',
      'Automated ingredient-level stock deduction',
      'Waste & spoilage tracking',
      'Food cost & margin monitoring',
      'Advanced operational reporting',
    ],
    ctaLabel: 'Choose Professional',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 15000,
    bestFor: 'Multi-branch groups & hospitality portfolios',
    description:
      'Centralized operational oversight, multi-branch management, and consolidated reporting for growing hospitality groups.',
    features: [
      'Everything included in Professional',
      'Multi-branch outlet management',
      'Central store & inter-branch stock transfers',
      'Consolidated business reporting',
      'Branch-level performance monitoring',
      'Enterprise role & access controls',
    ],
    ctaLabel: 'Explore Enterprise',
  },
];

export const PLAN_COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    category: 'Point of Sale & Sales',
    rows: [
      { feature: 'POS operations & checkout', starter: true, business: true, professional: true, enterprise: true },
      { feature: 'Order management', starter: true, business: true, professional: true, enterprise: true },
      { feature: 'Menu & modifier management', starter: true, business: true, professional: true, enterprise: true },
      { feature: 'Cashier shift operations', starter: true, business: true, professional: true, enterprise: true },
      { feature: 'Sales & tender reporting', starter: true, business: true, professional: true, enterprise: true },
    ],
  },
  {
    category: 'Kitchen & Service Operations',
    rows: [
      { feature: 'Kitchen Display System (KDS)', starter: false, business: true, professional: true, enterprise: true },
      { feature: 'Multi-station kitchen order routing', starter: false, business: true, professional: true, enterprise: true },
      { feature: 'Order status & workflow visibility', starter: false, business: true, professional: true, enterprise: true },
    ],
  },
  {
    category: 'Inventory & Cost Control',
    rows: [
      { feature: 'Basic inventory management', starter: true, business: true, professional: true, enterprise: true },
      { feature: 'Recipe management & BOMs', starter: false, business: false, professional: true, enterprise: true },
      { feature: 'Ingredient-level stock deduction', starter: false, business: false, professional: true, enterprise: true },
      { feature: 'Recipe costing & food cost monitoring', starter: false, business: false, professional: true, enterprise: true },
      { feature: 'Waste tracking & stock movement logs', starter: false, business: false, professional: true, enterprise: true },
    ],
  },
  {
    category: 'Financial & Business Intelligence',
    rows: [
      { feature: 'Daily revenue & sales analytics', starter: true, business: true, professional: true, enterprise: true },
      { feature: 'Operational performance reporting', starter: false, business: true, professional: true, enterprise: true },
      { feature: 'Consolidated multi-branch reporting', starter: false, business: false, professional: false, enterprise: true },
    ],
  },
  {
    category: 'Multi-Outlet & Integrations',
    rows: [
      { feature: 'Safaricom M-Pesa Daraja integration', starter: false, business: true, professional: true, enterprise: true },
      { feature: 'Multi-branch management & oversight', starter: false, business: false, professional: false, enterprise: true },
      { feature: 'Central store & branch stock transfers', starter: false, business: false, professional: false, enterprise: true },
    ],
  },
];

export const PRICING_FAQS: PricingFaq[] = [
  {
    question: 'How much does Servora restaurant and hospitality software cost in Kenya?',
    answer:
      'Servora offers four transparent KES subscription tiers: Starter (KSh 2,500/month) for single-outlet cafés, Business (KSh 4,500/month) with Kitchen Display System and M-Pesa Daraja integration, Professional (KSh 8,000/month) with recipe costing and waste tracking, and Enterprise (KSh 15,000/month) for multi-branch hospitality groups.',
  },
  {
    question: 'Do annual subscriptions include a discount?',
    answer:
      'Yes. Paying annually bills at 10x the monthly rate (saving approximately 17%, equivalent to two months free), while six-month billing is priced at 5x the monthly rate (saving one month free, approximately 16.7%).',
  },
  {
    question: 'Can Mavora Technologies supply POS terminals and thermal printers with our software plan?',
    answer:
      'Yes. Mavora Technologies provides turnkey POS hardware procurement, pre-configuration, and on-site installation across Kenya alongside any Servora software plan. Hardware is quoted and procured separately from software subscriptions.',
  },
  {
    question: 'Which Servora plan is right for my hospitality business?',
    answer:
      'Choose based on operational needs rather than venue size alone. Starter covers core POS and basic inventory; Business adds KDS and M-Pesa Daraja; Professional unlocks recipe BOMs, automated ingredient deduction, and food-cost tracking; Enterprise supports multi-branch management and consolidated reporting.',
  },
  {
    question: 'Can I pay for six months instead of one year?',
    answer:
      'Yes. You can select Every 6 Months billing at 5x the monthly subscription rate, receiving one month free compared with six individual monthly payments.',
  },
  {
    question: 'Does Servora track ingredient consumption and food costs?',
    answer:
      'Yes. On the Professional and Enterprise plans, you can configure menu item Bills of Materials (BOM) so completed POS sales automatically deduct mapped ingredient quantities and surface food-cost visibility.',
  },
  {
    question: 'Does Servora support Safaricom M-Pesa payments?',
    answer:
      'Yes. Safaricom M-Pesa Daraja integration is included on the Business, Professional, and Enterprise plans.',
  },
  {
    question: 'How do I get assistance selecting a plan or requesting a product demonstration?',
    answer:
      'Click any plan CTA or "Talk to Our Team" to reach Mavora Technologies Ltd in Kilimani, Nairobi via our Contact page.',
  },
];

export function calculatePlanBilling(monthlyPrice: number, interval: BillingInterval) {
  const option = BILLING_OPTIONS.find((opt) => opt.id === interval) ?? BILLING_OPTIONS[0];
  const billedTotal = monthlyPrice * option.multiplier;
  const effectiveMonthly = Math.round(billedTotal / option.monthsCovered);
  const fullPrice = monthlyPrice * option.monthsCovered;
  const savingsAmount = fullPrice - billedTotal;

  return {
    option,
    billedTotal,
    effectiveMonthly,
    savingsAmount,
  };
}