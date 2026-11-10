"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleSchema = exports.createRoleSchema = exports.ENTERPRISE_PERMISSIONS_CATALOG = void 0;
const zod_1 = require("zod");
exports.ENTERPRISE_PERMISSIONS_CATALOG = [
    // 1. Point of Sale & Front of House
    { id: 'pos.access', label: 'Access POS Terminal', description: 'Can sign into active POS registers', domain: 'POS' },
    { id: 'pos.checkout', label: 'Process Checkouts', description: 'Can tender cash, card, and mobile payments', domain: 'POS' },
    { id: 'pos.void', label: 'Void Order Items', description: 'Can void live ticket lines after firing', domain: 'POS', isSensitive: true },
    { id: 'pos.discount', label: 'Apply Custom Discounts', description: 'Can override item and order pricing', domain: 'POS', isSensitive: true },
    { id: 'orders.view', label: 'View Order Ledger', description: 'Can inspect past guest bills and receipts', domain: 'POS' },
    { id: 'tables.manage', label: 'Manage Floor Layout', description: 'Can merge, split, and transfer tables', domain: 'POS' },
    { id: 'reservations.manage', label: 'Manage Reservations Desk', description: 'Can create bookings and manage waitlist', domain: 'POS' },
    // 2. Kitchen & Culinary
    { id: 'kitchen.view', label: 'Access Kitchen Display', description: 'Can view live incoming KDS orders', domain: 'KITCHEN' },
    { id: 'kitchen.manage', label: 'Fulfill & Route Tickets', description: 'Can bump tickets and change prep station routing', domain: 'KITCHEN' },
    { id: 'recipes.view', label: 'View Standard BOM Recipes', description: 'Can inspect dish formulas and costing matrices', domain: 'KITCHEN' },
    // 3. Inventory & Logistics
    { id: 'inventory.view', label: 'View Stock Valuations', description: 'Can inspect on-hand inventory levels and bins', domain: 'INVENTORY' },
    { id: 'inventory.adjust', label: 'Direct Stock Adjustments', description: 'Can post manual stock variance writes', domain: 'INVENTORY', isSensitive: true },
    { id: 'inventory.manage', label: 'Transfers & Logistics Fleet', description: 'Can dispatch inter-branch consignments and carrier vans', domain: 'INVENTORY' },
    { id: 'inventory.count', label: 'Perform Stocktakes', description: 'Can initiate and finalize physical inventory audits', domain: 'INVENTORY' },
    // 4. Procurement & Supply Chain
    { id: 'purchasing.view', label: 'View Purchase Orders', description: 'Can browse vendor records and requisitions', domain: 'PROCUREMENT' },
    { id: 'purchasing.manage', label: 'Create & Approve POs', description: 'Can commit purchase contracts to vendors', domain: 'PROCUREMENT', isSensitive: true },
    { id: 'purchasing.receive', label: 'Intake Goods Received (GRN)', description: 'Can inspect inbound shipments and credit inventory', domain: 'PROCUREMENT' },
    // 5. Finance, Treasury & Cash
    { id: 'payments.view', label: 'View Payment Ledgers', description: 'Can review transaction settlement archives', domain: 'FINANCE' },
    { id: 'payments.reconcile', label: 'Bank & M-Pesa Reconciliation', description: 'Can balance bank accounts and Daraja statements', domain: 'FINANCE', isSensitive: true },
    { id: 'cash.view', label: 'Open Drawer Floats', description: 'Can view cashier shift tills and cash counts', domain: 'FINANCE' },
    { id: 'cash.reconcile', label: 'End of Day Z-Out', description: 'Can execute final drawer balancing and variances', domain: 'FINANCE', isSensitive: true },
    { id: 'refunds.view', label: 'Process Payment Refunds', description: 'Can authorize money reversals to customers', domain: 'FINANCE', isSensitive: true },
    { id: 'reports.view', label: 'Access Executive BI Reports', description: 'Can generate profit/loss and gross margin reports', domain: 'FINANCE' },
    // 6. Workforce & Governance
    { id: 'staff.view', label: 'View Employee Directory', description: 'Can browse staff profiles and basic contact data', domain: 'STAFF' },
    { id: 'staff.manage', label: 'Provision Staff & Reset PINs', description: 'Can create accounts and configure POS credentials', domain: 'STAFF', isSensitive: true },
    { id: 'staff.roles', label: 'Administer RBAC Clearances', description: 'Can configure functional role permissions', domain: 'STAFF', isSensitive: true },
    // 7. System Administration
    { id: 'settings.view', label: 'View System Topology', description: 'Can review branch details and fiscal parameters', domain: 'SYSTEM' },
    { id: 'settings.manage', label: 'Modify Company Architecture', description: 'Can alter tax settings, eTIMS, and hardware integrations', domain: 'SYSTEM', isSensitive: true },
];
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Role name must be at least 2 characters'),
    slug: zod_1.z
        .string()
        .trim()
        .min(2)
        .regex(/^[A-Z0-9_]+$/, 'Slug must be uppercase alphanumeric with underscores (e.g. SHIFT_SUPERVISOR)'),
    description: zod_1.z.string().trim().optional().nullable(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).optional(),
    description: zod_1.z.string().trim().optional().nullable(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
});
