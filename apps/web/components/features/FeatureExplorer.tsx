// apps/web/components/features/FeatureExplorer.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ExplorerCategory {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  capabilities: string[];
  ctaLabel: string;
  ctaHref: string;
  previewHeader: string;
  previewTag: string;
  previewBlocks: { label: string; value: string; note: string }[];
  previewActivity: { title: string; status: string; meta: string }[];
}

const EXPLORER_CATEGORIES: ExplorerCategory[] = [
  {
    id: 'pos-sales',
    label: 'POS & Orders',
    eyebrow: 'Front-of-House & Guest Service',
    title: 'Touch POS, Floor Layouts, Reservations & Online Ordering',
    description:
      'Capture Dine-In, Takeaway, Delivery, Online Storefront, and Bar Tab orders from one connected register. Manage visual floor layouts, table reservations, guest waitlists, dynamic pricing schedules, and real-time 86 lists.',
    capabilities: [
      'Dine-In, Takeaway, Delivery, Bar Tabs & Online Ordering Storefront',
      'Visual floor layouts, table reservations & guest waitlist queue',
      'Dynamic pricing schedules (happy hour) & real-time 86 availability list',
      'Aggregator webhooks (Uber / Glovo) & offline-resilient checkout',
    ],
    ctaLabel: 'Explore Restaurant Workflows',
    ctaHref: '/solutions/restaurants',
    previewHeader: 'servora-pos / orders-and-floor-console',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'Order Channels', value: 'POS & Online', note: 'Dine-In, Tabs & Delivery' },
      { label: 'Floor & Host', value: 'Tables & Waitlist', note: 'Live Reservations' },
      { label: 'Menu Control', value: '86 List & Pricing', note: 'Dynamic Schedules' },
    ],
    previewActivity: [
      { title: 'Table 08 • Open Dining Check', status: 'Sent to KDS', meta: 'Modifiers & course notes attached' },
      { title: 'Online Storefront • Order #309', status: 'Rider Dispatched', meta: 'Tracked in Dispatch & Delivery' },
      { title: 'Happy Hour Pricing Schedule', status: 'Active', meta: 'Auto-applied to Beverage category' },
    ],
  },
  {
    id: 'kitchen-ops',
    label: 'Kitchen (KDS)',
    eyebrow: 'Multi-Station Culinary Operations',
    title: 'Kitchen Display System (KDS) & Culinary SLA Performance',
    description:
      'Automatically split items from a single guest order and route them to Grill, Bar, Cold Pantry, Pastry, and Expediter screens. Monitor target, warning, and critical cook SLAs with backup station failover.',
    capabilities: [
      'Automated multi-station routing across Grill, Bar, Pantry & Expediter',
      'Target, warning & critical SLA countdown timers per ticket',
      'Completed ticket history & culinary speed-of-service analytics',
      'Backup station failover & complete staff execution audit trails',
    ],
    ctaLabel: 'Explore Cloud Kitchen KDS',
    ctaHref: '/solutions/cloud-kitchens',
    previewHeader: 'servora-kds / kitchen-display-console',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'Prep Stations', value: 'Grill • Bar • Pantry', note: 'Auto-split routing' },
      { label: 'Cook Timers', value: 'Culinary SLA', note: 'Speed-of-Service KPIs' },
      { label: 'Continuity', value: 'Station Failover', note: 'Backup screen routing' },
    ],
    previewActivity: [
      { title: 'Ticket #412 • Grill Station', status: 'Within SLA', meta: '2x Grilled Platter • Medium' },
      { title: 'Ticket #412 • Bar Station', status: 'Bumped Ready', meta: '2x Fresh Juice • Expediter notified' },
      { title: 'Ticket #415 • Cold Pantry', status: 'Queued', meta: '1x Garden Salad • Logged in history' },
    ],
  },
  {
    id: 'inventory-logistics',
    label: 'Inventory & Fleet',
    eyebrow: 'Recipe BOM, Warehouse & Logistics',
    title: 'Recipe BOM Costing, Warehouse Bins & Logistics Fleet Dispatch',
    description:
      'Link every dish to a BOM recipe for automatic stock deduction on sale. Manage raw material SKUs, bin cards, lot batches and expiry dates, automated par-level reorders, and inter-branch fleet dispatches.',
    capabilities: [
      'BOM recipes with unit conversions (g/kg, ml/L) & food cost margins',
      'Warehouse layout, storage bins, lot batches & expiry date tracking',
      'Automated reorder engine (par levels) & physical stock audits',
      'Inter-branch transfers & logistics fleet dispatch console (vans/reefers)',
    ],
    ctaLabel: 'Explore Stock Control',
    ctaHref: '/solutions/bars-lounges',
    previewHeader: 'servora-inventory / stock-and-fleet-ledger',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'Stock Trigger', value: 'Auto BOM Deduct', note: 'Bin cards & valuation' },
      { label: 'Replenishment', value: 'Reorder Engine', note: 'Par-level alerts' },
      { label: 'Logistics', value: 'Fleet Dispatch', note: 'Inter-branch transfers' },
    ],
    previewActivity: [
      { title: 'POS Sale • Signature Dish', status: 'BOM Deducted', meta: 'Raw ingredients depleted from kitchen bin' },
      { title: 'Cold Storage • Lot Batch #B-19', status: 'FIFO Tracked', meta: 'Expiry date & shelf-life monitored' },
      { title: 'Fleet Dispatch • Reefer Van #02', status: 'In Transit', meta: 'Central depot to Branch B transfer' },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    eyebrow: 'Vendors & 3-Way Match',
    title: 'Supplier Procurement, GRNs & 3-Way Invoice Matching',
    description:
      'Control purchasing from department requisitions through Purchase Orders (POs), Goods Received Notes (GRNs) with accepted/rejected quantity checks, 3-way supplier invoice matching, and vendor debit notes.',
    capabilities: [
      'Vendor directory & department purchase requisitions',
      'Purchase Orders (POs) & Goods Received Notes (GRNs)',
      'Supplier invoices with 3-way match verification',
      'Vendor returns & automated debit note tracking',
    ],
    ctaLabel: 'Request Supply Chain Demo',
    ctaHref: '/contact',
    previewHeader: 'servora-procurement / po-grn-3way-match',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'Workflow', value: 'PR → PO → GRN', note: 'Full approval trail' },
      { label: 'Verification', value: '3-Way Match', note: 'PO, GRN & Invoice' },
      { label: 'Discrepancies', value: 'Debit Notes', note: 'Vendor returns logged' },
    ],
    previewActivity: [
      { title: 'PO #1084 • Fresh Produce Vendor', status: 'GRN Verified', meta: 'Accepted quantities posted to stock' },
      { title: 'Invoice #INV-442 • 3-Way Match', status: 'Matched', meta: 'Cleared for Accounts Payable ledger' },
      { title: 'Vendor Return • Damaged Batch', status: 'Debit Note', meta: 'Linked to supplier balance' },
    ],
  },
  {
    id: 'treasury-payments',
    label: 'Treasury & M-Pesa',
    eyebrow: 'Payments, Cash & Accounting',
    title: 'M-Pesa Express/C2B, Z-Reports, Expenses & Financial Control',
    description:
      'Unify tender settlements with native M-Pesa Express and C2B/B2B, bank account reconciliation, end-of-day Z-reports, operational expense ledgers, Accounts Payable (AP), and KRA eTIMS tax ledgers.',
    capabilities: [
      'M-Pesa Express (STK Push), C2B/B2B & bank account reconciliation',
      'Cash drawer registers, cashier till shifts & end-of-day Z-reports',
      'Financial control cockpit, expense ledger & Accounts Payable (AP)',
      'Tax compliance, KRA eTIMS ledger & general journal adjustments',
    ],
    ctaLabel: 'Explore Kenya Operations',
    ctaHref: '/hospitality-software-kenya',
    previewHeader: 'servora-finance / treasury-and-mpesa-cockpit',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'M-Pesa Daraja', value: 'STK & C2B/B2B', note: 'Auto callback match' },
      { label: 'Cash Control', value: 'Z-Report Closeout', note: 'Drawer float & shifts' },
      { label: 'Accounting', value: 'AP & eTIMS', note: 'Expenses & Journals' },
    ],
    previewActivity: [
      { title: 'M-Pesa STK Push • Bill #890', status: 'Reconciled', meta: 'Matched to tender settlement cockpit' },
      { title: 'End of Day Z-Report • Shift #02', status: 'Closed Out', meta: 'Cash drawer & bank clearing balanced' },
      { title: 'Tax Compliance Ledger', status: 'eTIMS Ready', meta: 'VAT & Catering Levy itemized' },
    ],
  },
  {
    id: 'loyalty-marketing',
    label: 'Loyalty & Marketing',
    eyebrow: 'Guest CRM & Outreach',
    title: 'Loyalty Tiers, Gift Cards & SMS/Email Campaign Broadcasts',
    description:
      'Turn first-time diners into repeat guests. Manage guest profiles, loyalty membership tiers, point accruals, vouchers, gift cards, and targeted SMS/email marketing campaigns from one control center.',
    capabilities: [
      'Guest profiles directory, visit history & feedback/reviews',
      'Loyalty tiers, membership programs & point accrual ledgers',
      'Vouchers, gift cards & promo code management',
      'Marketing control center with SMS/email campaigns & copy templates',
    ],
    ctaLabel: 'Explore Guest Solutions',
    ctaHref: '/solutions/restaurants',
    previewHeader: 'servora-growth / loyalty-and-campaigns',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'Guest CRM', value: 'Profiles & CSAT', note: 'Reviews & feedback' },
      { label: 'Retention', value: 'Loyalty Tiers', note: 'Points & Gift Cards' },
      { label: 'Outreach', value: 'SMS & Email', note: 'Campaign broadcasts' },
    ],
    previewActivity: [
      { title: 'Weekend Brunch Broadcast', status: 'Campaign Live', meta: 'SMS & email template dispatched' },
      { title: 'Gold Tier Member • Check #510', status: 'Points Accrued', meta: 'Voucher redeemed at POS register' },
      { title: 'Post-Dining Feedback', status: 'Logged', meta: 'Linked to guest CRM profile' },
    ],
  },
  {
    id: 'servora-ai',
    label: 'Servora AI',
    eyebrow: 'Servora Intelligence AI & Automations',
    title: 'AI Copilot, Demand Forecasting & Predictive Purchasing',
    description:
      'Move from reactive spreadsheets to proactive hospitality intelligence. Use the Copilot Assistant, cover forecasting, predictive purchasing, Boston Matrix menu engineering, and custom workflow automations.',
    capabilities: [
      'Copilot Assistant Console for instant operational queries',
      'Demand & cover forecasting to plan prep and staffing',
      'Predictive purchasing engine for smart replenishment',
      'Menu Engineering Matrix (Stars vs. Dogs) & workflow automations',
    ],
    ctaLabel: 'Request an AI Walkthrough',
    ctaHref: '/contact',
    previewHeader: 'servora-ai / copilot-and-forecasting',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'AI Copilot', value: 'Advisor Console', note: 'Natural-language BI' },
      { label: 'Forecasting', value: 'Demand & Covers', note: 'Footfall predictions' },
      { label: 'Menu Matrix', value: 'Stars & Margin', note: 'Smart replenishment' },
    ],
    previewActivity: [
      { title: 'Demand & Cover Forecast', status: 'Updated', meta: 'Weekend dinner cover projection ready' },
      { title: 'Predictive Purchasing Engine', status: 'PO Suggested', meta: 'Low-par ingredients flagged for order' },
      { title: 'Workflow Automation Rule', status: 'Triggered', meta: 'Low-stock alert sent to store manager' },
    ],
  },
  {
    id: 'workforce-bi',
    label: 'Staff & BI',
    eyebrow: 'Workforce, Reports & Security',
    title: 'Biometric Attendance, Tip Pools, Custom Reports & Audit Logs',
    description:
      'Enforce granular RBAC and 2FA security, track biometric clock-ins, manage server performance and tip pools, build custom reports, and schedule automated report deliveries across all branches.',
    capabilities: [
      'Weekly shift planner, biometric clock-in & manager handover notes',
      'Cash drawer custodians, server KPIs & tip pool tracking',
      'Custom report builder, scheduled deliveries & data exports (CSV/Excel)',
      'Immutable audit logs, multi-branch topology & 2FA security',
    ],
    ctaLabel: 'Compare Plans & Editions',
    ctaHref: '/pricing',
    previewHeader: 'servora-bi / workforce-and-analytics-tower',
    previewTag: 'Illustrative UI Preview',
    previewBlocks: [
      { label: 'Workforce', value: 'Biometric & Rota', note: 'Tip pool & handover' },
      { label: 'Analytics', value: 'Report Builder', note: 'Scheduled exports' },
      { label: 'Governance', value: 'RBAC & 2FA', note: 'Immutable audit logs' },
    ],
    previewActivity: [
      { title: 'Biometric Clock-In • Morning Shift', status: 'Verified', meta: 'Matched against weekly shift rota' },
      { title: 'Scheduled Executive Report', status: 'Delivered', meta: 'Theoretical vs. actual food cost sent' },
      { title: 'Immutable Audit Trail', status: 'Logged', meta: 'Void & discount approvals recorded' },
    ],
  },
];

export default function FeatureExplorer() {
  const [activeId, setActiveId] = useState<string>(EXPLORER_CATEGORIES[0].id);
  const active =
    EXPLORER_CATEGORIES.find((cat) => cat.id === activeId) ?? EXPLORER_CATEGORIES[0];

  return (
    <div className="w-full">
      {/* Accessible Horizontal Tab Bar */}
      <div
        role="tablist"
        aria-label="Servora Platform Feature Categories"
        className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 lg:justify-center border-b border-gray-200/80"
      >
        {EXPLORER_CATEGORIES.map((category) => {
          const isSelected = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`feature-panel-${category.id}`}
              id={`feature-tab-${category.id}`}
              onClick={() => setActiveId(category.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-servora-core ${
                isSelected
                  ? 'bg-servora-core text-white shadow-md shadow-servora-core/25'
                  : 'bg-white text-servora-navy border border-gray-200 hover:border-servora-core hover:text-servora-core'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panel */}
      <div
        role="tabpanel"
        id={`feature-panel-${active.id}`}
        aria-labelledby={`feature-tab-${active.id}`}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-10 shadow-sm"
      >
        {/* Left: Description & Capabilities */}
        <div className="lg:col-span-5 flex flex-col items-start text-left">
          <span className="inline-flex items-center rounded-full bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-3">
            {active.eyebrow}
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-servora-navy leading-snug">
            {active.title}
          </h3>
          <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
            {active.description}
          </p>

          <ul className="mt-5 space-y-2.5 w-full">
            {active.capabilities.map((cap) => (
              <li
                key={cap}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-servora-navy font-medium"
              >
                <svg
                  className="w-4 h-4 text-servora-teal flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 pt-5 border-t border-gray-100 w-full flex flex-wrap items-center gap-4">
            <Link
              href={active.ctaHref}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-navy px-6 text-xs font-bold text-white shadow-sm transition-all hover:bg-servora-core"
            >
              {active.ctaLabel} &rarr;
            </Link>
            <Link
              href="/contact"
              className="text-xs font-bold text-servora-core hover:underline"
            >
              Book a Live Demo
            </Link>
          </div>
        </div>

        {/* Right: Clearly Labeled Illustrative Interface Preview */}
        <div className="lg:col-span-7 w-full">
          <div className="rounded-2xl bg-servora-navy p-5 sm:p-7 text-white shadow-xl ring-1 ring-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 flex-shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 flex-shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 flex-shrink-0" />
                <span className="ml-2 text-[11px] font-mono text-gray-300 bg-white/5 px-2.5 py-0.5 rounded border border-white/10 truncate">
                  {active.previewHeader}
                </span>
              </div>
              <span className="text-[10px] font-mono text-servora-teal uppercase tracking-wider">
                {active.previewTag}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {active.previewBlocks.map((block) => (
                <div
                  key={block.label}
                  className="rounded-xl bg-white/5 p-3.5 border border-white/10"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    {block.label}
                  </p>
                  <p className="text-sm sm:text-base font-extrabold text-white mt-1">
                    {block.value}
                  </p>
                  <p className="text-[11px] text-servora-teal mt-0.5">{block.note}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              {active.previewActivity.map((row) => (
                <div
                  key={row.title}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-4 py-3 border border-white/10"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{row.title}</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">{row.meta}</p>
                  </div>
                  <span className="inline-flex self-start sm:self-center items-center rounded-lg bg-servora-teal/20 px-2.5 py-1 text-[10px] font-bold text-servora-teal ring-1 ring-inset ring-servora-teal/30 whitespace-nowrap">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}