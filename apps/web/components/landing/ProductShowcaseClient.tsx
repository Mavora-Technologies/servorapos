// apps/web/components/landing/ProductShowcaseClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ShowcaseTab {
  id: string;
  label: string;
  badge: string;
  heading: string;
  description: string;
  capabilities: string[];
  ctaText: string;
  ctaHref: string;
  consoleTitle: string;
  consoleMetrics: { label: string; value: string; sub: string; accent: string }[];
  consoleRows: { item: string; status: string; detail: string }[];
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: 'pos-sales',
    label: 'POS & Sales',
    badge: 'Front-of-House Speed',
    heading: 'High-Velocity Point of Sale for Dine-In, Takeaway, Bar Tabs & Room Service',
    description:
      'Empower waiters and cashiers with an intuitive touchscreen register engineered for peak hospitality service. Split bills, apply modifiers, hold bar tabs, and continue ringing sales offline without dropping a single order.',
    capabilities: [
      'Dine-In, Takeaway, Delivery & Hotel Room Service modes',
      'Custom modifier groups, course firing & split guest checks',
      'Offline-resilient local queueing with automatic cloud sync',
      'Direct thermal receipt printer & cash drawer trigger support',
    ],
    ctaText: 'Explore POS Capabilities',
    ctaHref: '/features',
    consoleTitle: 'servora-pos / terminal-kilimani-01',
    consoleMetrics: [
      { label: 'Active Floor Tables', value: '18 / 24', sub: 'Dining & Terrace Zones', accent: 'text-emerald-400' },
      { label: 'Checkout Mode', value: 'Multi-Tender', sub: 'M-Pesa + Card + Cash', accent: 'text-servora-bright' },
      { label: 'Terminal Status', value: 'Online & Synced', sub: 'Offline Queue Ready', accent: 'text-servora-teal' },
    ],
    consoleRows: [
      { item: 'Table 12 • Main Dining', status: 'Fired to KDS', detail: '2x Flame-Grilled Tilapia, 2x House Mocktail' },
      { item: 'VIP Lounge • Tab #104', status: 'STK Push Sent', detail: 'Safaricom M-Pesa Daraja Callback Verified' },
      { item: 'Takeaway • Order #409', status: 'Ready for Pickup', detail: 'Packaged & Fiscal Receipt Printed' },
    ],
  },
  {
    id: 'kitchen-operations',
    label: 'Kitchen Operations',
    badge: 'Multi-Station KDS',
    heading: 'Real-Time Kitchen Display System (KDS) & Station-Level Routing',
    description:
      'Eliminate lost paper dockets and kitchen noise. When an order is confirmed at the table or counter, Servora automatically routes each item to its designated preparation screen—Grill, Bar, Cold Pantry, Pastry, or Expediter.',
    capabilities: [
      'Automated item routing across Grill, Bar, Pantry & Pastry screens',
      'Live target, warning & critical SLA countdown timers',
      'Course-by-course pacing and single-tap item bump controls',
      'Full staff execution audit logs and station prep velocity tracking',
    ],
    ctaText: 'Explore Kitchen Workflows',
    ctaHref: '/solutions/cloud-kitchens',
    consoleTitle: 'servora-kds / hot-kitchen-grill-station',
    consoleMetrics: [
      { label: 'Active Tickets', value: '7 Orders', sub: 'Grill & Hot Line', accent: 'text-amber-400' },
      { label: 'SLA Compliance', value: 'Target < 12m', sub: 'Color-Coded Alerts', accent: 'text-emerald-400' },
      { label: 'Station Failover', value: 'Active', sub: 'Expediter Synced', accent: 'text-servora-teal' },
    ],
    consoleRows: [
      { item: 'Ticket #882 • Table 04', status: 'In Prep (04:12)', detail: '1x Flame-Grilled Tilapia • Medium Spice' },
      { item: 'Ticket #883 • Room 205', status: 'In Prep (02:45)', detail: '1x Prime Beef Fillet • Side Mashed Potatoes' },
      { item: 'Ticket #880 • Bar Counter', status: 'Bumped & Ready', detail: 'Dispatched to Waiter Station' },
    ],
  },
  {
    id: 'inventory-recipes',
    label: 'Inventory & Recipes',
    badge: 'Gram-Level BOM Control',
    heading: 'Automated Recipe Bill of Materials (BOM) & Real-Time Stock Deduction',
    description:
      'Standardize portions and protect your food cost margins. Link every menu item to an exact ingredient recipe so stock levels update automatically the moment a dish is sold.',
    capabilities: [
      'Gram, milliliter & unit-level recipe Bill of Materials (BOM)',
      'Automatic ingredient deduction upon POS order confirmation',
      'Batch expiry monitoring, low-stock alerts & wastage logging',
      'End-to-end supplier Purchase Orders (POs) & Goods Received Notes (GRNs)',
    ],
    ctaText: 'Explore Inventory & BOM',
    ctaHref: '/features',
    consoleTitle: 'servora-inventory / menu-recipe-bom-engine',
    consoleMetrics: [
      { label: 'Menu Dish Sold', value: 'Flame-Grilled Tilapia', sub: 'Auto BOM Triggered', accent: 'text-emerald-400' },
      { label: 'Stock Deduction', value: '3 Ingredients', sub: 'Real-Time Ledger Sync', accent: 'text-servora-bright' },
      { label: 'Variance Tracking', value: 'Theoretical vs Actual', sub: 'Batch Audit Ready', accent: 'text-amber-400' },
    ],
    consoleRows: [
      { item: 'Fresh Tilapia Whole', status: '-1 pc deducted', detail: '49 pc → 48 pc remaining in Cold Storage' },
      { item: 'Swahili Spices Blend', status: '-15 g deducted', detail: '4,200 g → 4,185 g remaining in Dry Store' },
      { item: 'Fresh Lemon & Herbs', status: '-50 g deducted', detail: '1,950 g → 1,900 g remaining in Kitchen Prep' },
    ],
  },
  {
    id: 'reservations',
    label: 'Reservations',
    badge: 'Floor & Guest CRM',
    heading: 'Interactive Dining Floor Plans, Table Reservations & Guest Profiles',
    description:
      'Maximize table turnover and deliver personalized hospitality. Manage dining zones, track live table occupancy states, book advance reservations, and reward returning guests.',
    capabilities: [
      'Visual dining room, terrace, poolside & VIP lounge floor layouts',
      'Real-time table status indicators (Available, Seated, Billed, Cleaning)',
      'Advance guest reservation calendar & walk-in waitlist management',
      'Guest history profiles, dietary notes & loyalty reward tracking',
    ],
    ctaText: 'Explore Restaurant Solutions',
    ctaHref: '/solutions/restaurants',
    consoleTitle: 'servora-floor / reservation-host-desk',
    consoleMetrics: [
      { label: 'Floor Zones', value: '4 Active Areas', sub: 'Main, Terrace, VIP, Bar', accent: 'text-servora-teal' },
      { label: 'Table Status', value: 'Live Occupancy', sub: 'Synced with Waiter POS', accent: 'text-emerald-400' },
      { label: 'Guest CRM', value: 'Loyalty Enabled', sub: 'Visit & Spend History', accent: 'text-servora-bright' },
    ],
    consoleRows: [
      { item: '19:30 • Party of 6 (VIP)', status: 'Confirmed', detail: 'Assigned to Terrace Table T-04 • Anniversary Note' },
      { item: '20:00 • Party of 2', status: 'Seated', detail: 'Main Dining Table M-09 • Waiter Assigned' },
      { item: '20:15 • Walk-In Guest', status: 'Waitlist Queue', detail: 'Estimated Seating in 10 Minutes' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    badge: 'Native M-Pesa & Shift Custody',
    heading: 'Safaricom M-Pesa Daraja Integration, Multi-Tender Billing & Shift Custody',
    description:
      'Eliminate manual till message checking and end-of-day cash discrepancies. Trigger M-Pesa STK Push prompts directly from the bill and reconcile every cashier drawer with strict audit trails.',
    capabilities: [
      'Native Safaricom M-Pesa Daraja STK Push & C2B Till reconciliation',
      'Split payments across M-Pesa, Visa/Mastercard, Cash & Room Charge',
      'Configurable Kenyan tax rules (16% VAT, 2% Catering Levy) & KRA eTIMS readiness',
      'Blind cashier shift counts, safe drops & variance accountability',
    ],
    ctaText: 'Explore Kenya Payment Hub',
    ctaHref: '/hospitality-software-kenya',
    consoleTitle: 'servora-finance / mpesa-daraja-reconciliation',
    consoleMetrics: [
      { label: 'M-Pesa Daraja', value: 'STK & C2B Live', sub: 'Instant Callback Match', accent: 'text-emerald-400' },
      { label: 'Currency & Tax', value: 'KES • VAT Ready', sub: 'eTIMS Fiscal Support', accent: 'text-servora-teal' },
      { label: 'Shift Custody', value: 'Blind Drawer Audit', sub: 'Cashier Handover Log', accent: 'text-amber-400' },
    ],
    consoleRows: [
      { item: 'M-Pesa STK Push • Bill #319', status: 'Paid & Matched', detail: 'Receipt Code Verified Automatically at POS' },
      { item: 'Split Tender • Bill #320', status: 'Reconciled', detail: 'KES via M-Pesa + Card Terminal Settlement' },
      { item: 'Evening Cashier Shift #02', status: 'Balanced', detail: 'Drawer Float & Safe Drop Signed Off' },
    ],
  },
  {
    id: 'analytics',
    label: 'Business Analytics',
    badge: 'Executive BI & Multi-Branch',
    heading: 'Real-Time Hospitality Business Intelligence & Multi-Branch Control',
    description:
      'Turn daily transactions into clear executive decisions. Monitor live revenue, food cost margins, top-selling menu items, and branch-by-branch performance from anywhere.',
    capabilities: [
      'Live revenue, ticket velocity & hourly sales trend dashboards',
      'Menu engineering profitability matrices & food cost variance reports',
      'Multi-branch tenant isolation with centralized head-office reporting',
      'Staff sales performance, void/discount audits & exportable ledgers',
    ],
    ctaText: 'Compare Plans & Editions',
    ctaHref: '/pricing',
    consoleTitle: 'servora-bi / executive-overview-dashboard',
    consoleMetrics: [
      { label: 'Revenue & Ticket Velocity', value: 'Real-Time Stream', sub: 'All Outlets Consolidated', accent: 'text-emerald-400' },
      { label: 'Channel Distribution', value: 'Dine-In • Takeaway', sub: 'Room Service & Delivery', accent: 'text-servora-bright' },
      { label: 'Cost Control', value: 'Live Food Cost %', sub: 'Recipe Margin Tracking', accent: 'text-servora-teal' },
    ],
    consoleRows: [
      { item: 'Menu Engineering Matrix', status: 'Updated Live', detail: 'Tracks Top Menu Products by Quantity Sold & Margin' },
      { item: 'Multi-Branch Comparison', status: 'Consolidated', detail: 'Kilimani, Westlands & Mombasa Outlet Ledgers' },
      { item: 'Audit & Void Exceptions', status: 'Zero Unapproved', detail: 'Manager PIN Authorization Enforced' },
    ],
  },
];

export default function ProductShowcaseClient() {
  const [activeTabId, setActiveTabId] = useState<string>(SHOWCASE_TABS[0].id);
  const activeTab = SHOWCASE_TABS.find((tab) => tab.id === activeTabId) || SHOWCASE_TABS[0];

  return (
    <div className="w-full">
      {/* Scrollable Horizontal Tab Controls */}
      <div
        role="tablist"
        aria-label="Servora Platform Modules"
        className="flex items-center gap-2 overflow-x-auto pb-3 sm:pb-4 mb-8 sm:justify-center no-scrollbar border-b border-gray-200/80"
      >
        {SHOWCASE_TABS.map((tab) => {
          const isSelected = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTabId(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer focus:outline-none ${
                isSelected
                  ? 'bg-servora-core text-white shadow-md shadow-servora-core/25'
                  : 'bg-white text-servora-navy border border-gray-200 hover:border-servora-core hover:text-servora-core'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Panel */}
      <div
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-10 shadow-sm"
      >
        {/* Left Column: Narrative & Capabilities */}
        <div className="lg:col-span-5 flex flex-col items-start text-left">
          <span className="inline-flex items-center rounded-full bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-3">
            {activeTab.badge}
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-servora-navy leading-snug">
            {activeTab.heading}
          </h3>
          <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal leading-relaxed">
            {activeTab.description}
          </p>

          <ul className="mt-5 space-y-2.5 w-full">
            {activeTab.capabilities.map((cap) => (
              <li key={cap} className="flex items-start gap-2.5 text-xs sm:text-sm text-servora-navy font-medium">
                <svg
                  className="w-4 h-4 text-servora-teal flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 pt-5 border-t border-gray-100 w-full flex flex-wrap items-center gap-4">
            <Link
              href={activeTab.ctaHref}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-servora-navy px-6 text-xs font-bold text-white shadow-sm transition-all hover:bg-servora-core"
            >
              {activeTab.ctaText} &rarr;
            </Link>
            <Link
              href="/contact"
              className="text-xs font-bold text-servora-core hover:underline"
            >
              Schedule a Live Walkthrough
            </Link>
          </div>
        </div>

        {/* Right Column: Interactive Software UI Console Preview */}
        <div className="lg:col-span-7 w-full">
          <div className="rounded-2xl bg-servora-navy p-5 sm:p-7 text-white shadow-xl ring-1 ring-white/10">
            {/* Window Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] font-mono text-gray-300 bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
                  {activeTab.consoleTitle}
                </span>
              </div>
              <span className="text-[10px] font-mono text-servora-teal uppercase tracking-wider">
                Servora Cloud 2.0
              </span>
            </div>

            {/* Metric Cards inside Console */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {activeTab.consoleMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl bg-white/5 p-3.5 border border-white/10"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    {metric.label}
                  </p>
                  <p className={`text-base sm:text-lg font-extrabold mt-1 ${metric.accent}`}>
                    {metric.value}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-0.5">{metric.sub}</p>
                </div>
              ))}
            </div>

            {/* Live Activity Rows inside Console */}
            <div className="space-y-2.5">
              {activeTab.consoleRows.map((row) => (
                <div
                  key={row.item}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-4 py-3 border border-white/10"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{row.item}</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">{row.detail}</p>
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