import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  decimal,
  jsonb,
  date,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Define explicit role enum
export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'CASHIER',
  'WAITER',
  'CHEF',
  'HEAD_CHEF',
  'STOREKEEPER',
  'ACCOUNTANT',
]);

// ============================================================================
// 1. TENANTS, BRANCHES & PLATFORM IDENTITY
// ============================================================================

export const tenants = pgTable(
  'tenants',
  {
    id: serial('id').primaryKey(),
    businessName: varchar('business_name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }),
    legalName: varchar('legal_name', { length: 255 }),
    kraPin: varchar('kra_pin', { length: 50 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    currency: varchar('currency', { length: 10 }).default('KES').notNull(),
    timezone: varchar('timezone', { length: 64 }).default('Africa/Nairobi').notNull(),
    subscriptionPlan: varchar('subscription_plan', { length: 50 }).default('STARTER').notNull(),
    subscriptionStatus: varchar('subscription_status', { length: 50 }).default('ACTIVE').notNull(),
    logoUrl: text('logo_url'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('tenants_slug_idx').on(t.slug),
    index('tenants_active_idx').on(t.isActive),
  ]
);

export const branches = pgTable(
  'branches',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(), // e.g., NBO-WESTLANDS
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    kraPin: varchar('kra_pin', { length: 50 }),
    etimsBranchId: varchar('etims_branch_id', { length: 20 }).default('00'), // KRA bhfId
    etimsDeviceSerial: varchar('etims_device_serial', { length: 100 }), // KRA sdcId / mrcNo
    receiptFooter: text('receipt_footer'),
    isMainBranch: boolean('is_main_branch').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('branches_tenant_code_idx').on(t.tenantId, t.code),
    index('branches_tenant_idx').on(t.tenantId),
  ]
);

// ============================================================================
// 2. USERS, RBAC (ROLES & PERMISSIONS) & AUDIT LOGS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    defaultBranchId: integer('default_branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    pinHash: varchar('pin_hash', { length: 255 }),
    // Use varchar instead of userRoleEnum to support dynamic tenant roles
    role: varchar('role', { length: 100 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('users_tenant_idx').on(t.tenantId),
    index('users_tenant_branch_idx').on(t.tenantId, t.defaultBranchId),
    // Scopes email uniqueness to the tenant
    uniqueIndex('users_tenant_email_idx').on(t.tenantId, t.email),
  ]
);

export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Nullable for system-wide default roles
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    permissions: jsonb('permissions').$type<string[]>().default([]).notNull(), // e.g. ["pos.checkout", "pos.void", "inventory.adjust"]
    isSystemRole: boolean('is_system_role').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('roles_tenant_slug_idx').on(t.tenantId, t.slug),
  ]
);

export const userBranchMemberships = pgTable(
  'user_branch_memberships',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: integer('role_id').references(() => roles.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('user_branch_unique_idx').on(t.userId, t.branchId),
    index('user_branch_tenant_idx').on(t.tenantId),
  ]
);

// ============================================================================
// 3. MENU CATEGORIES, ITEMS & MODIFIERS
// ============================================================================

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable = shared across all tenant branches
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('menu_categories_tenant_idx').on(t.tenantId),
  ]
);

export const menuItems = pgTable(
  'menu_items',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable = available at all branches
    categoryId: integer('category_id')
      .references(() => menuCategories.id, { onDelete: 'restrict' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    description: text('description'),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    costEstimate: decimal('cost_estimate', { precision: 12, scale: 2 }).default('0.00').notNull(),
    // Stock tracking policy per Section 16: RECIPE, STOCKED_PRODUCT, COMPOSITE, NON_TRACKED
    stockTrackingType: varchar('stock_tracking_type', { length: 50 }).default('RECIPE').notNull(),
    directInventoryItemId: integer('direct_inventory_item_id'), // Used when stockTrackingType = STOCKED_PRODUCT
    kitchenStation: varchar('kitchen_station', { length: 50 }).default('MAIN_KITCHEN').notNull(), // MAIN_KITCHEN, GRILL, BAR, PASTRY
    prepTimeMinutes: integer('prep_time_minutes').default(15).notNull(),
    // Tax & KRA eTIMS classification
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(),
    cateringLevyRate: decimal('catering_levy_rate', { precision: 5, scale: 2 }).default('2.00').notNull(),
    isTaxInclusive: boolean('is_tax_inclusive').default(true).notNull(),
    etimsItemCode: varchar('etims_item_code', { length: 50 }),
    etimsClassCode: varchar('etims_class_code', { length: 50 }),
    etimsTaxTypeCode: varchar('etims_tax_type_code', { length: 10 }).default('B'), // B = 16% VAT
    isAvailable: boolean('is_available').default(true).notNull(),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('menu_items_tenant_sku_idx').on(t.tenantId, t.sku),
    index('menu_items_tenant_category_idx').on(t.tenantId, t.categoryId),
    index('menu_items_tenant_available_idx').on(t.tenantId, t.isAvailable),
  ]
);

export const menuModifiers = pgTable(
  'menu_modifiers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    menuItemId: integer('menu_item_id')
      .references(() => menuItems.id, { onDelete: 'cascade' })
      .notNull(),
    groupName: varchar('group_name', { length: 100 }).notNull(), // e.g., "Size", "Milk Option", "Extras"
    optionName: varchar('option_name', { length: 100 }).notNull(), // e.g., "Large", "Oat Milk", "Extra Cheese"
    priceDelta: decimal('price_delta', { precision: 12, scale: 2 }).default('0.00').notNull(),
    linkedInventoryItemId: integer('linked_inventory_item_id'), // Optional ingredient deduction for modifier
    linkedQuantity: decimal('linked_quantity', { precision: 12, scale: 4 }).default('0.0000'),
    isRequired: boolean('is_required').default(false).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('menu_modifiers_item_idx').on(t.tenantId, t.menuItemId),
  ]
);

// ============================================================================
// 4. INVENTORY, RECIPES (BOM) & TRACEABLE STOCK MOVEMENTS
// ============================================================================

export const suppliers = pgTable(
  'suppliers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    contactPerson: varchar('contact_person', { length: 150 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    kraPin: varchar('kra_pin', { length: 50 }), // Tax compliance for KRA ETR / eTIMS
    physicalAddress: text('physical_address'),
    city: varchar('city', { length: 100 }).default('Nairobi'),
    paymentTerms: varchar('payment_terms', { length: 50 }).default('NET_30'), // 'COD', 'NET_7', 'NET_14', 'NET_30', 'PREPAID'
    leadTimeDays: integer('lead_time_days').default(2).notNull(),
    bankName: varchar('bank_name', { length: 100 }),
    bankAccountNumber: varchar('bank_account_number', { length: 100 }),
    mpesaPaybillNumber: varchar('mpesa_paybill_number', { length: 50 }),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('suppliers_tenant_idx').on(t.tenantId),
    index('suppliers_active_idx').on(t.tenantId, t.isActive),
  ]
);

export const purchaseRequests = pgTable(
  'purchase_requests',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    requestNumber: varchar('request_number', { length: 50 }).notNull(), // e.g. "PR-2026-001"
    status: varchar('status', { length: 30 }).default('PENDING').notNull(), // 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO'
    priority: varchar('priority', { length: 20 }).default('NORMAL').notNull(), // 'LOW', 'NORMAL', 'URGENT'
    requestedById: integer('requested_by_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedById: integer('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
    department: varchar('department', { length: 80 }).default('KITCHEN').notNull(), // 'KITCHEN', 'BAR', 'PASTRY', 'FLOOR'
    estimatedTotal: decimal('estimated_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    notes: text('notes'),
    rejectionReason: text('rejection_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('pr_tenant_idx').on(t.tenantId),
    index('pr_status_idx').on(t.status),
    index('pr_priority_idx').on(t.priority),
  ]
);

export const purchaseRequestItems = pgTable(
  'purchase_request_items',
  {
    id: serial('id').primaryKey(),
    purchaseRequestId: integer('purchase_request_id')
      .notNull()
      .references(() => purchaseRequests.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    requestedQuantity: decimal('requested_quantity', { precision: 12, scale: 4 }).notNull(),
    estimatedUnitCost: decimal('estimated_unit_cost', { precision: 12, scale: 4 }).notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('pr_items_request_idx').on(t.purchaseRequestId),
    index('pr_items_item_idx').on(t.inventoryItemId),
  ]
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    poNumber: varchar('po_number', { length: 50 }).notNull(), // e.g., "PO-2026-001"
    status: varchar('status', { length: 30 }).default('DRAFT').notNull(), // 'DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'
    paymentTerms: varchar('payment_terms', { length: 50 }).default('NET_30').notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    deliveryExpectedDate: timestamp('delivery_expected_date', { withTimezone: true }),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('po_tenant_idx').on(t.tenantId),
    index('po_status_idx').on(t.status),
    index('po_supplier_idx').on(t.supplierId),
  ]
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: serial('id').primaryKey(),
    purchaseOrderId: integer('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    quantityOrdered: decimal('quantity_ordered', { precision: 12, scale: 4 }).notNull(),
    quantityReceived: decimal('quantity_received', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(), // standard VAT 16%
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('po_items_order_idx').on(t.purchaseOrderId),
    index('po_items_item_idx').on(t.inventoryItemId),
  ]
);

export const goodsReceivedNotes = pgTable(
  'goods_received_notes',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    purchaseOrderId: integer('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'restrict' }),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    grnNumber: varchar('grn_number', { length: 50 }).notNull(), // e.g. "GRN-2026-001"
    supplierDeliveryNote: varchar('supplier_delivery_note', { length: 100 }), // Purveyor's physical delivery note/invoice #
    receivedById: integer('received_by_id').references(() => users.id, { onDelete: 'set null' }),
    receivedDate: timestamp('received_date', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('grn_tenant_idx').on(t.tenantId),
    index('grn_po_idx').on(t.purchaseOrderId),
    index('grn_supplier_idx').on(t.supplierId),
  ]
);

export const goodsReceivedItems = pgTable(
  'goods_received_items',
  {
    id: serial('id').primaryKey(),
    grnId: integer('grn_id')
      .notNull()
      .references(() => goodsReceivedNotes.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    quantityAccepted: decimal('quantity_accepted', { precision: 12, scale: 4 }).notNull(),
    quantityRejected: decimal('quantity_rejected', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    rejectionReason: text('rejection_reason'),
    notes: text('notes'),
  },
  (t) => [
    index('grn_items_grn_idx').on(t.grnId),
    index('grn_items_item_idx').on(t.inventoryItemId),
  ]
);

export const supplierInvoices = pgTable(
  'supplier_invoices',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    purchaseOrderId: integer('purchase_order_id')
      .references(() => purchaseOrders.id, { onDelete: 'set null' }),
    goodsReceivedNoteId: integer('goods_received_note_id')
      .references(() => goodsReceivedNotes.id, { onDelete: 'set null' }),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(), // Purveyor's physical invoice #
    internalRef: varchar('internal_ref', { length: 50 }).notNull(), // System internal ref (e.g. "PINV-2026-001")
    status: varchar('status', { length: 30 }).default('UNPAID').notNull(), // 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'DISPUTED'
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).notNull(),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 4 }).notNull(),
    paidAmount: decimal('paid_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    invoiceDate: timestamp('invoice_date', { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('supplier_inv_tenant_idx').on(t.tenantId),
    index('supplier_inv_status_idx').on(t.status),
    index('supplier_inv_due_idx').on(t.dueDate),
    index('supplier_inv_supplier_idx').on(t.supplierId),
  ]
);

export const supplierInvoiceItems = pgTable(
  'supplier_invoice_items',
  {
    id: serial('id').primaryKey(),
    supplierInvoiceId: integer('supplier_invoice_id')
      .notNull()
      .references(() => supplierInvoices.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 4 }).notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).notNull(),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('supplier_inv_items_inv_idx').on(t.supplierInvoiceId),
    index('supplier_inv_items_item_idx').on(t.inventoryItemId),
  ]
);

export const supplierReturns = pgTable(
  'supplier_returns',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    goodsReceivedNoteId: integer('goods_received_note_id')
      .references(() => goodsReceivedNotes.id, { onDelete: 'set null' }),
    supplierInvoiceId: integer('supplier_invoice_id')
      .references(() => supplierInvoices.id, { onDelete: 'set null' }),
    returnNumber: varchar('return_number', { length: 50 }).notNull(), // e.g. "PRT-2026-001"
    debitNoteNumber: varchar('debit_note_number', { length: 50 }), // Fiscal / Purveyor Debit Note #
    status: varchar('status', { length: 30 }).default('PENDING_DISPATCH').notNull(), // 'PENDING_DISPATCH', 'DISPATCHED', 'CREDITED', 'REJECTED'
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).notNull(),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 4 }).notNull(),
    createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('supplier_returns_tenant_idx').on(t.tenantId),
    index('supplier_returns_status_idx').on(t.status),
    index('supplier_returns_supplier_idx').on(t.supplierId),
  ]
);

export const supplierReturnItems = pgTable(
  'supplier_return_items',
  {
    id: serial('id').primaryKey(),
    supplierReturnId: integer('supplier_return_id')
      .notNull()
      .references(() => supplierReturns.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 4 }).notNull(),
    reason: varchar('reason', { length: 80 }).notNull(), // 'DEFECTIVE_SPOILED', 'WRONG_ITEM', 'BROKEN_PACKAGING', 'TEMPERATURE_ABUSE', 'OVER_DELIVERY'
    notes: text('notes'),
  },
  (t) => [
    index('supplier_ret_items_ret_idx').on(t.supplierReturnId),
    index('supplier_ret_items_inv_idx').on(t.inventoryItemId),
  ]
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    barcode: varchar('barcode', { length: 100 }), // GTIN-13 / EAN barcode
    materialType: varchar('material_type', { length: 50 }).default('RAW_MATERIAL').notNull(),
    // 'RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'CONSUMABLE'
    category: varchar('category', { length: 100 }).notNull(),
    unit: varchar('unit', { length: 30 }).notNull(), // Base consumption unit (e.g. 'kg', 'litres', 'pcs')
    purchaseUnit: varchar('purchase_unit', { length: 30 }).default('pcs'),
    conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).default('1.0000').notNull(),
    preferredSupplierId: integer('preferred_supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    costPrice: decimal('cost_price', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    valuationMethod: varchar('valuation_method', { length: 30 }).default('FIFO').notNull(), // 'FIFO', 'AVCO', 'STANDARD'
    minThreshold: decimal('min_threshold', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    reorderQuantity: decimal('reorder_quantity', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    currentStock: decimal('current_stock', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    trackingMethod: varchar('tracking_method', { length: 30 }).default('BATCH_EXPIRY').notNull(),
    // 'BATCH_EXPIRY', 'SERIALIZED', 'NONE'
    storageCondition: varchar('storage_condition', { length: 50 }).default('DRY_AMBIENT').notNull(),
    // 'DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'WARM_HEATED'
    taxClassification: varchar('tax_classification', { length: 20 }).default('A_16').notNull(), // 'A_16' (16%), 'B_ZERO' (0%), 'E_EXEMPT'
    allowNegativeStock: boolean('allow_negative_stock').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('inv_items_tenant_idx').on(t.tenantId),
    index('inv_items_sku_idx').on(t.sku),
    index('inv_items_cat_idx').on(t.category),
    index('inv_items_mat_type_idx').on(t.materialType),
  ]
);

export const unitConversions = pgTable(
  'unit_conversions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fromUnit: varchar('from_unit', { length: 50 }).notNull(), // e.g. "Crate", "Sack 50kg", "tbsp", "cup"
    toUnit: varchar('to_unit', { length: 50 }).notNull(), // Base ledger unit: "kg", "g", "litres", "ml", "pcs"
    conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).notNull(), // Multiply fromUnit by this factor to get toUnit
    inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id, { onDelete: 'cascade' }), // Optional: if null, it is a global unit rule (e.g. 1 kg = 1000 g)
    unitCategory: varchar('unit_category', { length: 50 }).notNull().default('WEIGHT'), // 'WEIGHT', 'VOLUME', 'PACKAGING', 'CUSTOM'
    description: text('description'),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('unit_conv_tenant_idx').on(t.tenantId),
    index('unit_conv_item_idx').on(t.inventoryItemId),
  ]
);

export const inventoryBatches = pgTable(
  'inventory_batches',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),

    batchNumber: varchar('batch_number', { length: 50 }).notNull(), // System internal lot #
    supplierBatchNumber: varchar('supplier_batch_number', { length: 100 }), // Vendor's printed batch code
    certificateNumber: varchar('certificate_number', { length: 100 }), // Quality inspection cert / COA

    initialQuantity: decimal('initial_quantity', { precision: 12, scale: 4 }).notNull(),
    currentQuantity: decimal('current_quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),

    locationBin: varchar('location_bin', { length: 80 }), // e.g. "Walk-in Dairy Chiller 2B"
    storageTemperature: decimal('storage_temperature', { precision: 5, scale: 2 }), // Logged intake temp in °C

    receivedDate: timestamp('received_date', { withTimezone: true }).defaultNow().notNull(),
    expiryDate: timestamp('expiry_date', { withTimezone: true }).notNull(),

    // Enterprise QC Lifecycle
    status: varchar('status', { length: 30 }).default('ACTIVE').notNull(),
    // 'ACTIVE', 'QUARANTINE', 'QUALITY_HOLD', 'EXPIRED', 'DISCARDED', 'DEPLETED'

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('inv_batch_tenant_idx').on(t.tenantId),
    index('inv_batch_item_idx').on(t.inventoryItemId),
    index('inv_batch_status_idx').on(t.status),
    index('inv_batch_expiry_idx').on(t.expiryDate),
  ]
);

export const warehouseLocations = pgTable(
  'warehouse_locations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull(), // e.g. "CHL-01-B2"
    name: varchar('name', { length: 100 }).notNull(), // e.g. "Walk-in Dairy Chiller (Shelf 2B)"
    zoneType: varchar('zone_type', { length: 50 }).default('DRY_AMBIENT').notNull(),
    // 'DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'PREP_LINE', 'HOLDING_PASS'
    targetMinTemp: decimal('target_min_temp', { precision: 5, scale: 2 }), // e.g. 2.00
    targetMaxTemp: decimal('target_max_temp', { precision: 5, scale: 2 }), // e.g. 8.00
    isRefrigerated: boolean('is_refrigerated').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('wh_loc_tenant_idx').on(t.tenantId),
    index('wh_loc_branch_idx').on(t.branchId),
    index('wh_loc_code_idx').on(t.code),
  ]
);

export const wasteLogs = pgTable(
  'waste_logs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    inventoryBatchId: integer('inventory_batch_id')
      .references(() => inventoryBatches.id, { onDelete: 'set null' }),

    // Enterprise Cost Center / Department
    department: varchar('department', { length: 50 }).default('KITCHEN').notNull(),
    // 'KITCHEN', 'BAR', 'BAKERY', 'BUTCHERY', 'MAIN_STORE', 'FLOOR'

    wasteReason: varchar('waste_reason', { length: 80 }).notNull(),
    // 'EXPIRED', 'SPOILED_STORAGE', 'OVERCOOKED_BURNED', 'DROPPED_DAMAGED', 'PREP_ERROR', 'OVER_PORTIONED', 'EQUIPMENT_FAILURE'

    dispositionMethod: varchar('disposition_method', { length: 50 }).default('TRASH_LANDFILL').notNull(),
    // 'TRASH_LANDFILL', 'COMPOST_ORGANIC', 'STAFF_FEEDING', 'SUPPLIER_CLAIM'

    quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    totalLossCost: decimal('total_loss_cost', { precision: 12, scale: 4 }).notNull(),

    locationBin: varchar('location_bin', { length: 80 }),
    documentReference: varchar('document_reference', { length: 50 }),

    reportedById: integer('reported_by_id').references(() => users.id, { onDelete: 'set null' }),
    witnessedById: integer('witnessed_by_id').references(() => users.id, { onDelete: 'set null' }),

    notes: text('notes'),
    loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('waste_logs_tenant_idx').on(t.tenantId),
    index('waste_logs_item_idx').on(t.inventoryItemId),
    index('waste_logs_reason_idx').on(t.wasteReason),
    index('waste_logs_logged_idx').on(t.loggedAt),
  ]
);

// ============================================================================
// 5. DINING AREAS, FLOOR TABLES, RESERVATIONS & WAITLIST
// ============================================================================

export const diningAreas = pgTable(
  'dining_areas',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(), // e.g., Main Floor, Terrace, VIP Lounge
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('dining_areas_tenant_branch_idx').on(t.tenantId, t.branchId),
  ]
);

export const restaurantTables = pgTable(
  'restaurant_tables',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    areaId: integer('area_id')
      .references(() => diningAreas.id, { onDelete: 'cascade' })
      .notNull(),
    tableLabel: varchar('table_label', { length: 50 }).notNull(), // e.g., T1, T2, VIP-1
    capacity: integer('capacity').notNull(),
    status: varchar('status', { length: 50 }).default('Available').notNull(), // Available, Occupied, Reserved, Cleaning
    assignedWaiterId: integer('assigned_waiter_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('tables_tenant_area_label_idx').on(t.tenantId, t.areaId, t.tableLabel),
    index('tables_tenant_status_idx').on(t.tenantId, t.status),
  ]
);

export const reservations = pgTable(
  'reservations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    partySize: integer('party_size').notNull(),
    reservationDate: timestamp('reservation_date', { withTimezone: true }).notNull(),
    expectedDuration: integer('expected_duration').default(120).notNull(), // Minutes
    tableId: integer('table_id').references(() => restaurantTables.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).default('Pending').notNull(), // Pending, Confirmed, Checked-In, Completed, Cancelled, No-Show
    specialRequests: text('special_requests'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('reservations_tenant_date_idx').on(t.tenantId, t.reservationDate),
    index('reservations_tenant_table_idx').on(t.tenantId, t.tableId),
  ]
);

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
    partySize: integer('party_size').notNull(),
    quotedWaitTime: integer('quoted_wait_time').notNull(), // Minutes
    status: varchar('status', { length: 50 }).default('Waiting').notNull(), // Waiting, Notified, Seated, Cancelled
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('waitlist_tenant_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// 6. ORDERS, ORDER ITEMS, KITCHEN TICKETS & DELIVERY
// ============================================================================

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'restrict' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    tableId: integer('table_id').references(() => restaurantTables.id, { onDelete: 'set null' }),

    // Enterprise Table & Station Snapshot (Resolves SQLSTATE 42703)
    tableName: varchar('table_name', { length: 100 }), // e.g. "Table 4 (Veranda)", "VIP Lounge", "Takeaway"

    waiterId: integer('waiter_id').references(() => users.id, { onDelete: 'set null' }),
    cashierId: integer('cashier_id').references(() => users.id, { onDelete: 'set null' }),
    orderNumber: varchar('order_number', { length: 50 }).notNull(),
    orderType: varchar('order_type', { length: 50 }).notNull(), // Dine-In, Takeaway, Delivery, Bar-Tab
    status: varchar('status', { length: 50 }).default('Draft').notNull(), // Draft, Confirmed, Sent-To-Kitchen, Preparing, Ready, Served, Completed, Cancelled
    paymentStatus: varchar('payment_status', { length: 50 }).default('Pending').notNull(), // Pending, Partial, Paid, Refunded
    customerName: varchar('customer_name', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 50 }),
    buyerKraPin: varchar('buyer_kra_pin', { length: 50 }), // Optional B2B KRA PIN for eTIMS receipt
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountTotal: decimal('discount_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
    tax: decimal('tax', { precision: 12, scale: 2 }).notNull(), // VAT amount
    cateringLevy: decimal('catering_levy', { precision: 12, scale: 2 }).default('0.00').notNull(),
    serviceCharge: decimal('service_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
    deliveryFee: decimal('delivery_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(), // Note: column name is 'total'
    amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).default('0.00').notNull(),
    notes: text('notes'),
    cancelReason: text('cancel_reason'),
    idempotencyKey: varchar('idempotency_key', { length: 100 }), // Offline sync & retry protection
    inventoryDeducted: boolean('inventory_deducted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('orders_tenant_number_idx').on(t.tenantId, t.orderNumber),
    uniqueIndex('orders_idempotency_idx').on(t.tenantId, t.idempotencyKey),
    index('orders_tenant_status_idx').on(t.tenantId, t.status, t.paymentStatus),
    index('orders_tenant_created_idx').on(t.tenantId, t.createdAt),
    index('orders_table_idx').on(t.tableId),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    menuItemId: integer('menu_item_id')
      .references(() => menuItems.id, { onDelete: 'restrict' })
      .notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(), // Supports integer portions + decimal weight (e.g. 0.75 kg nyama choma)
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    modifiersPrice: decimal('modifiers_price', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    unitCostSnapshot: decimal('unit_cost_snapshot', { precision: 12, scale: 2 }).default('0.00').notNull(), // Preserves historical COGS
    selectedModifiers: jsonb('selected_modifiers').$type<
      Array<{ modifierId: number; name: string; price: number }>
    >().default([]),
    kitchenStatus: varchar('kitchen_status', { length: 50 }).default('New').notNull(), // New, Accepted, Preparing, Ready, Served, Cancelled
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    index('order_items_menu_item_idx').on(t.menuItemId),
  ]
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),

    // Enterprise Movement Type Classification
    type: varchar('type', { length: 50 }).notNull(),
    // 'GOODS_RECEIPT_PO', 'POS_RECIPE_DEPLETION', 'PHYSICAL_INVENTORY_ADJ', 'WASTE_SCRAP', 'SUPPLIER_RETURN', 'STORNO_REVERSAL', 'TRANSFER'

    quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    totalValuation: decimal('total_valuation', { precision: 12, scale: 4 }).notNull(),
    balanceAfter: decimal('balance_after', { precision: 12, scale: 4 }).notNull(),

    batchNumber: varchar('batch_number', { length: 50 }),
    locationBin: varchar('location_bin', { length: 80 }), // e.g. "Walk-in Chiller Rack 2B"
    documentReference: varchar('document_reference', { length: 100 }), // e.g. "GRN-2026-001", "PO-2026-002"

    // Storno audit trail linking
    reversedMovementId: integer('reversed_movement_id'),
    isReversed: boolean('is_reversed').default(false).notNull(),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('stock_mov_tenant_idx').on(t.tenantId),
    index('stock_mov_item_idx').on(t.inventoryItemId),
    index('stock_mov_type_idx').on(t.type),
    index('stock_mov_created_idx').on(t.createdAt),
  ]
);

export const stockCounts = pgTable(
  'stock_counts',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    countNumber: varchar('count_number', { length: 50 }).notNull(), // e.g. "PI-2026-001"
    status: varchar('status', { length: 30 }).default('IN_PROGRESS').notNull(), // 'IN_PROGRESS', 'PENDING_APPROVAL', 'RECONCILED', 'CANCELLED'
    countType: varchar('count_type', { length: 30 }).default('FULL').notNull(), // 'FULL', 'CYCLE', 'SPOT_CHECK'
    category: varchar('category', { length: 100 }), // null for full count
    isBlindCount: boolean('is_blind_count').default(true).notNull(), // Hides book quantities from floor staff
    totalItemsCount: integer('total_items_count').default(0).notNull(),
    discrepancyItemsCount: integer('discrepancy_items_count').default(0).notNull(),
    netVarianceCost: decimal('net_variance_cost', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    conductorId: integer('conductor_id').references(() => users.id, { onDelete: 'set null' }),
    approvedById: integer('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('stock_cnt_tenant_idx').on(t.tenantId),
    index('stock_cnt_status_idx').on(t.status),
  ]
);

export const stockCountItems = pgTable(
  'stock_count_items',
  {
    id: serial('id').primaryKey(),
    stockCountId: integer('stock_count_id')
      .notNull()
      .references(() => stockCounts.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    expectedQuantity: decimal('expected_quantity', { precision: 12, scale: 4 }).notNull(),
    countedQuantity: decimal('counted_quantity', { precision: 12, scale: 4 }),
    varianceQuantity: decimal('variance_quantity', { precision: 12, scale: 4 }),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    varianceCost: decimal('variance_cost', { precision: 12, scale: 4 }),
    recountRequired: boolean('recount_required').default(false).notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('stock_cnt_items_cnt_idx').on(t.stockCountId),
    index('stock_cnt_items_inv_idx').on(t.inventoryItemId),
  ]
);

export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    transferNumber: varchar('transfer_number', { length: 50 }).notNull(), // e.g. "STO-2026-001"
    status: varchar('status', { length: 30 }).default('PENDING').notNull(),
    // 'PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'DISCREPANCY_COMPLETED', 'CANCELLED'

    sourceBranchId: integer('source_branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    destinationBranchId: integer('destination_branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),

    // Logistics & Transport Audit
    carrierVehiclePlate: varchar('carrier_vehicle_plate', { length: 50 }), // e.g. "KBZ 412X (Reefer Van)"
    driverName: varchar('driver_name', { length: 100 }),
    dispatchTempProbe: decimal('dispatch_temp_probe', { precision: 5, scale: 2 }), // e.g. 3.2°C
    arrivalTempProbe: decimal('arrival_temp_probe', { precision: 5, scale: 2 }),

    totalValuation: decimal('total_valuation', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    transitLossValuation: decimal('transit_loss_valuation', { precision: 12, scale: 4 }).default('0.0000').notNull(),

    requestedById: integer('requested_by_id').references(() => users.id, { onDelete: 'set null' }),
    dispatchedById: integer('dispatched_by_id').references(() => users.id, { onDelete: 'set null' }),
    receivedById: integer('received_by_id').references(() => users.id, { onDelete: 'set null' }),

    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('sto_tenant_idx').on(t.tenantId),
    index('sto_status_idx').on(t.status),
    index('sto_source_idx').on(t.sourceBranchId),
    index('sto_dest_idx').on(t.destinationBranchId),
  ]
);

export const stockTransferItems = pgTable(
  'stock_transfer_items',
  {
    id: serial('id').primaryKey(),
    transferId: integer('transfer_id')
      .notNull()
      .references(() => stockTransfers.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    requestedQuantity: decimal('requested_quantity', { precision: 12, scale: 4 }).notNull(),
    sentQuantity: decimal('sent_quantity', { precision: 12, scale: 4 }),
    receivedQuantity: decimal('received_quantity', { precision: 12, scale: 4 }),
    transitLossQuantity: decimal('transit_loss_quantity', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).notNull(),
    batchNumber: varchar('batch_number', { length: 50 }),
    notes: text('notes'),
  },
  (t) => [
    index('sto_items_transfer_idx').on(t.transferId),
    index('sto_items_inv_idx').on(t.inventoryItemId),
  ]
);


export const logisticsVehicles = pgTable(
  'logistics_vehicles',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    primaryBranchId: integer('primary_branch_id').references(() => branches.id, { onDelete: 'set null' }),
    plateNumber: varchar('plate_number', { length: 30 }).notNull(), // e.g., KDA 412X
    makeModel: varchar('make_model', { length: 100 }).notNull(), // e.g., Isuzu FRR / Toyota HiAce
    vehicleType: varchar('vehicle_type', { length: 40 }).notNull().default('VAN'), // 'REFRIGERATED_TRUCK', 'VAN', 'MOTORCYCLE', 'PICKUP'
    driverName: varchar('driver_name', { length: 120 }).notNull(),
    driverPhone: varchar('driver_phone', { length: 30 }).notNull(),
    maxPayloadKg: numeric('max_payload_kg', { precision: 10, scale: 2 }).notNull().default('1000.00'),
    temperatureControlled: boolean('temperature_controlled').notNull().default(false),
    currentStatus: varchar('current_status', { length: 30 }).notNull().default('AVAILABLE'), // 'AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'OFF_DUTY'
    currentLocationLat: numeric('current_location_lat', { precision: 10, scale: 7 }),
    currentLocationLng: numeric('current_location_lng', { precision: 10, scale: 7 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('logistics_vehicles_tenant_idx').on(t.tenantId),
    index('logistics_vehicles_status_idx').on(t.tenantId, t.currentStatus),
  ]
);

// 1. MASTER FLEET ASSET DIRECTORY (Unified from logistics_fleet)
export const logisticsFleet = pgTable(
  'logistics_fleet',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    
    // Core Plate & Type
    vehiclePlate: varchar('vehicle_plate', { length: 50 }).notNull(), // e.g. "KDE 321B"
    makeModel: varchar('make_model', { length: 100 }).default('Standard Fleet').notNull(),
    vehicleType: varchar('vehicle_type', { length: 50 }).default('REEFER_VAN').notNull(), // 'REEFER_VAN', 'BOX_TRUCK', 'PICKUP', 'MOTORBIKE'
    
    // Driver Details
    driverName: varchar('driver_name', { length: 120 }),
    driverPhone: varchar('driver_phone', { length: 30 }),
    
    // Payload & Capacity
    maxPayloadKg: numeric('max_payload_kg', { precision: 10, scale: 2 }).default('1500.00').notNull(),
    
    // Cold-Chain Controls
    isRefrigerated: boolean('is_refrigerated').default(false).notNull(),
    minTargetTemp: decimal('min_target_temp', { precision: 5, scale: 2 }), // e.g. 2.00
    maxTargetTemp: decimal('max_target_temp', { precision: 5, scale: 2 }), // e.g. 8.00
    
    // Live Operational Telemetry
    currentStatus: varchar('current_status', { length: 30 }).default('AVAILABLE').notNull(), // 'AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'OFF_DUTY'
    currentLocationLat: numeric('current_location_lat', { precision: 10, scale: 7 }),
    currentLocationLng: numeric('current_location_lng', { precision: 10, scale: 7 }),
    
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('fleet_tenant_idx').on(t.tenantId),
    index('fleet_plate_idx').on(t.tenantId, t.vehiclePlate),
    index('fleet_status_idx').on(t.tenantId, t.currentStatus),
  ]
);

// 2. B2B INTER-BRANCH TRANSFERS DISPATCH WAYBILLS
export const transferFleetDispatches = pgTable(
  'transfer_fleet_dispatches',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    transferId: integer('transfer_id')
      .notNull()
      .references(() => stockTransfers.id, { onDelete: 'cascade' }),
    fleetVehicleId: integer('fleet_vehicle_id')
      .notNull()
      .references(() => logisticsFleet.id, { onDelete: 'restrict' }),
    dispatchedById: integer('dispatched_by_id').references(() => users.id, { onDelete: 'set null' }),
    dispatchStatus: varchar('dispatch_status', { length: 30 }).default('IN_TRANSIT').notNull(), // 'IN_TRANSIT', 'DELIVERED', 'FAILED'
    departureOdometerKm: numeric('departure_odometer_km', { precision: 10, scale: 2 }),
    arrivalOdometerKm: numeric('arrival_odometer_km', { precision: 10, scale: 2 }),
    departureTime: timestamp('departure_time', { withTimezone: true }).defaultNow(),
    arrivalTime: timestamp('arrival_time', { withTimezone: true }),
    dispatchTempProbe: decimal('dispatch_temp_probe', { precision: 5, scale: 2 }),
    arrivalTempProbe: decimal('arrival_temp_probe', { precision: 5, scale: 2 }),
    deliveryNotes: text('delivery_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('transfer_dispatches_tenant_idx').on(t.tenantId),
    index('transfer_dispatches_transfer_idx').on(t.transferId),
    index('transfer_dispatches_vehicle_idx').on(t.fleetVehicleId),
  ]
);

// 3. B2C LAST-MILE CUSTOMER ORDER DELIVERIES
export const deliveryAssignments = pgTable(
  'delivery_assignments',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 100 }).default('In-House').notNull(), // 'In-House', 'Uber Direct', 'Bolt', 'Glovo'
    fleetVehicleId: integer('fleet_vehicle_id').references(() => logisticsFleet.id, { onDelete: 'set null' }), // Optional link if in-house
    driverName: varchar('driver_name', { length: 255 }).notNull(),
    driverPhone: varchar('driver_phone', { length: 50 }),
    deliveryAddress: text('delivery_address'),
    trackingUrl: varchar('tracking_url', { length: 500 }),
    deliveryFee: decimal('delivery_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 50 }).default('Assigned').notNull(), // 'Assigned', 'Dispatched', 'Delivered', 'Failed'
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  },
  (t) => [
    index('delivery_assignments_tenant_order_idx').on(t.tenantId, t.orderId),
  ]
);

// ============================================================================
// 7. PAYMENTS, M-PESA DARAJA (STK + C2B TILL), SHIFTS & KRA eTIMS
// ============================================================================

export const cashierShifts = pgTable(
  'cashier_shifts',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'restrict' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    cashierId: integer('cashier_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    closedByUserId: integer('closed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    openingFloat: decimal('opening_float', { precision: 12, scale: 2 }).default('0.00').notNull(),
    expectedCash: decimal('expected_cash', { precision: 12, scale: 2 }).default('0.00').notNull(),
    countedCash: decimal('counted_cash', { precision: 12, scale: 2 }),
    variance: decimal('variance', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 30 }).default('OPEN').notNull(), // OPEN, CLOSED
    varianceNotes: text('variance_notes'),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [
    index('cashier_shifts_tenant_status_idx').on(t.tenantId, t.status),
  ]
);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    paymentNumber: varchar('payment_number', { length: 50 }).notNull(), // e.g. "PMT-2026-001"

    // Enterprise Flow & Status
    paymentFlow: varchar('payment_flow', { length: 30 }).notNull(), // 'OUTBOUND_AP', 'INBOUND_AR'
    status: varchar('status', { length: 30 }).default('POSTED').notNull(),
    // 'POSTED', 'RECONCILED', 'CANCELLED_REVERSED', 'BOUNCED'

    // Method & Treasury Clearing Channel
    paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
    // 'MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH_DRAWER', 'CREDIT_CARD'
    clearingAccount: varchar('clearing_account', { length: 100 }).notNull(),
    // e.g. "KCB Operating Account (KES)", "Safaricom B2B Paybill 55210", "Main Safe Petty Cash"

    transactionReference: varchar('transaction_reference', { length: 100 }), // M-Pesa Code / Bank Slip # / Cheque #

    // Parties
    supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    supplierInvoiceId: integer('supplier_invoice_id').references(() => supplierInvoices.id, { onDelete: 'set null' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),

    currency: varchar('currency', { length: 10 }).default('KES').notNull(),
    amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),

    // Storno Audit
    reversedPaymentId: integer('reversed_payment_id'),
    isReversed: boolean('is_reversed').default(false).notNull(),

    processedById: integer('processed_by_id').references(() => users.id, { onDelete: 'set null' }),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('pmt_tenant_idx').on(t.tenantId),
    index('pmt_flow_idx').on(t.paymentFlow),
    index('pmt_status_idx').on(t.status),
    index('pmt_supplier_idx').on(t.supplierId),
    index('pmt_invoice_idx').on(t.supplierInvoiceId),
  ]
);

export const bankStatements = pgTable(
  'bank_statements',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    statementNumber: varchar('statement_number', { length: 50 }).notNull(), // e.g. "BST-2026-001"
    clearingAccount: varchar('clearing_account', { length: 100 }).notNull(), // Matching payments.clearingAccount
    openingBalance: decimal('opening_balance', { precision: 12, scale: 4 }).notNull(),
    closingBalance: decimal('closing_balance', { precision: 12, scale: 4 }).notNull(),
    statementDate: timestamp('statement_date', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 30 }).default('OPEN').notNull(), // 'OPEN', 'RECONCILED'
    createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('bank_stmt_tenant_idx').on(t.tenantId),
    index('bank_stmt_acc_idx').on(t.clearingAccount),
  ]
);

export const bankStatementLines = pgTable(
  'bank_statement_lines',
  {
    id: serial('id').primaryKey(),
    bankStatementId: integer('bank_statement_id')
      .notNull()
      .references(() => bankStatements.id, { onDelete: 'cascade' }),
    lineDate: timestamp('line_date', { withTimezone: true }).notNull(),
    transactionReference: varchar('transaction_reference', { length: 100 }), // Reference code on bank statement
    description: text('description').notNull(),
    amount: decimal('amount', { precision: 12, scale: 4 }).notNull(), // Positive = Credit, Negative = Debit
    matchedPaymentId: integer('matched_payment_id').references(() => payments.id, { onDelete: 'set null' }),
    isReconciled: boolean('is_reconciled').default(false).notNull(),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
  },
  (t) => [
    index('bank_stmt_line_stmt_idx').on(t.bankStatementId),
    index('bank_stmt_line_match_idx').on(t.matchedPaymentId),
  ]
);

export const mpesaTransactions = pgTable(
  'mpesa_transactions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),

    // Gateway Identifiers
    transactionType: varchar('transaction_type', { length: 50 }).notNull(),
    // 'C2B_PAYBILL', 'C2B_BUY_GOODS', 'STK_PUSH', 'B2B_PAYBILL', 'B2B_BUY_GOODS', 'B2C_PAYOUT'

    mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 50 }), // e.g. "QK8912KL99"
    checkoutRequestId: varchar('checkout_request_id', { length: 100 }), // STK Push tracking
    conversationId: varchar('conversation_id', { length: 100 }), // B2B / B2C tracking
    originatorConversationId: varchar('originator_conversation_id', { length: 100 }),

    // Transaction Details
    phoneNumber: varchar('phone_number', { length: 30 }),
    accountReference: varchar('account_reference', { length: 100 }).notNull(), // Paybill Acc # or Invoice #
    businessShortCode: varchar('business_short_code', { length: 50 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
    transactionDate: timestamp('transaction_date', { withTimezone: true }).defaultNow().notNull(),

    // Status
    status: varchar('status', { length: 30 }).default('PENDING').notNull(),
    // 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'
    resultCode: varchar('result_code', { length: 20 }),
    resultDesc: text('result_desc'),

    // Counterparties & Links
    supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    supplierInvoiceId: integer('supplier_invoice_id').references(() => supplierInvoices.id, { onDelete: 'set null' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'set null' }),

    // Audit & Payload
    rawPayload: jsonb('raw_payload'),
    initiatedById: integer('initiated_by_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('mpesa_tx_tenant_idx').on(t.tenantId),
    index('mpesa_tx_receipt_idx').on(t.mpesaReceiptNumber),
    index('mpesa_tx_status_idx').on(t.status),
    index('mpesa_tx_type_idx').on(t.transactionType),
  ]
);

export const refunds = pgTable(
  'refunds',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    refundNumber: varchar('refund_number', { length: 50 }).notNull(), // e.g. "REF-2026-001"

    // Enterprise Flow & Status
    refundFlow: varchar('refund_flow', { length: 30 }).notNull(), // 'AR_CUSTOMER_REFUND', 'AP_VENDOR_REFUND'
    status: varchar('status', { length: 30 }).default('APPROVED').notNull(), // 'APPROVED', 'PROCESSED', 'CANCELLED'

    // Links to Source Documents
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'set null' }),

    // Disbursement Channel
    refundMethod: varchar('refund_method', { length: 50 }).notNull(), // 'MPESA_REFUND', 'BANK_WIRE', 'CASH_DRAWER'
    clearingAccount: varchar('clearing_account', { length: 100 }).notNull(),
    transactionReference: varchar('transaction_reference', { length: 100 }), // M-Pesa Code / Wire Ref

    currency: varchar('currency', { length: 10 }).default('KES').notNull(),
    amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
    restockItems: boolean('restock_items').default(true).notNull(),

    processedById: integer('processed_by_id').references(() => users.id, { onDelete: 'set null' }),
    reasonCode: varchar('reason_code', { length: 100 }).notNull(), // 'DEFECTIVE_GOODS', 'CUSTOMER_CANCELLATION', 'PRICING_DISPUTE'
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('ref_tenant_idx').on(t.tenantId),
    index('ref_flow_idx').on(t.refundFlow),
    index('ref_order_idx').on(t.orderId),
  ]
);

export const cashDrawers = pgTable(
  'cash_drawers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    drawerCode: varchar('drawer_code', { length: 50 }).notNull(), // e.g. "POS-TERM-01"
    name: varchar('name', { length: 100 }).notNull(), // e.g. "Main Bar Cash Drawer"
    status: varchar('status', { length: 30 }).default('CLOSED').notNull(), // 'OPEN', 'CLOSED'
    currentBalance: decimal('current_balance', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('drawer_tenant_idx').on(t.tenantId),
  ]
);

export const drawerSessions = pgTable(
  'drawer_sessions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    drawerId: integer('drawer_id')
      .notNull()
      .references(() => cashDrawers.id, { onDelete: 'cascade' }),
    cashierId: integer('cashier_id').references(() => users.id, { onDelete: 'set null' }),
    supervisorId: integer('supervisor_id').references(() => users.id, { onDelete: 'set null' }),

    status: varchar('status', { length: 30 }).default('OPEN').notNull(),
    // 'OPEN', 'ACTIVE', 'COUNTED', 'CLOSED_RECONCILED'

    openingFloat: decimal('opening_float', { precision: 12, scale: 4 }).notNull(),
    cashSalesTotal: decimal('cash_sales_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    cashDropsTotal: decimal('cash_drops_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    payoutsTotal: decimal('payouts_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    expectedClosingBalance: decimal('expected_closing_balance', { precision: 12, scale: 4 }).notNull(),
    actualClosingBalance: decimal('actual_closing_balance', { precision: 12, scale: 4 }),
    variance: decimal('variance', { precision: 12, scale: 4 }), // Actual - Expected

    denominations: jsonb('denominations').$type<Record<string, number>>().default({}),

    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (t) => [
    index('session_tenant_idx').on(t.tenantId),
    index('session_drawer_idx').on(t.drawerId),
    index('session_status_idx').on(t.status),
  ]
);

export const mpesaC2bCallbacks = pgTable(
  'mpesa_c2b_callbacks',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'restrict' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    transId: varchar('trans_id', { length: 50 }).notNull(), // 10-char M-Pesa Receipt Code
    transactionType: varchar('transaction_type', { length: 50 }).notNull(), // CustomerBuyGoodsOnline / CustomerPayBillOnline
    transAmount: decimal('trans_amount', { precision: 12, scale: 2 }).notNull(),
    businessShortCode: varchar('business_short_code', { length: 30 }).notNull(),
    billRefNumber: varchar('bill_ref_number', { length: 100 }),
    msisdn: varchar('msisdn', { length: 100 }).notNull(), // Phone or hashed MSISDN
    firstName: varchar('first_name', { length: 100 }),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    transTime: varchar('trans_time', { length: 30 }).notNull(),
    allocationStatus: varchar('allocation_status', { length: 30 })
      .default('UNALLOCATED')
      .notNull(), // UNALLOCATED, PARTIALLY_ALLOCATED, FULLY_ALLOCATED
    allocatedAmount: decimal('allocated_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    claimedByUserId: integer('claimed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    claimedOrderId: integer('claimed_order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    rawPayload: jsonb('raw_payload'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('mpesa_c2b_tenant_trans_id_idx').on(t.tenantId, t.transId),
    index('mpesa_c2b_unallocated_idx').on(t.tenantId, t.allocationStatus, t.createdAt),
  ]
);

export const fiscalInvoices = pgTable(
  'fiscal_invoices',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'restrict' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'restrict' })
      .notNull(),
    invoiceType: varchar('invoice_type', { length: 30 }).default('SALE').notNull(), // SALE, CREDIT_NOTE
    buyerKraPin: varchar('buyer_kra_pin', { length: 50 }),
    cuInvoiceNumber: varchar('cu_invoice_number', { length: 100 }), // KRA invcNo
    sdcId: varchar('sdc_id', { length: 100 }), // KRA Control Unit ID
    internalData: text('internal_data'),
    receiptSignature: text('receipt_signature'),
    qrCodeUrl: text('qr_code_url'),
    fiscalStatus: varchar('fiscal_status', { length: 30 }).default('PENDING').notNull(), // PENDING, FISCALIZED, FAILED, EXEMPT
    retryCount: integer('retry_count').default(0).notNull(),
    lastError: text('last_error'),
    fiscalizedAt: timestamp('fiscalized_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('fiscal_invoices_tenant_order_idx').on(t.tenantId, t.orderId),
    index('fiscal_invoices_status_idx').on(t.tenantId, t.fiscalStatus),
  ]
);

// ============================================================================
// 8. DRIZZLE ORM RELATIONAL DEFINITIONS (Enables db.query.<tableName>.findMany)
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  branches: many(branches),
  users: many(users),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
  inventoryItems: many(inventoryItems),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  diningAreas: many(diningAreas),
  orders: many(orders),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [menuCategories.tenantId], references: [tenants.id] }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  tenant: one(tenants, { fields: [menuItems.tenantId], references: [tenants.id] }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  modifiers: many(menuModifiers),
  recipes: many(recipes),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [orders.branchId], references: [branches.id] }),
  table: one(restaurantTables, { fields: [orders.tableId], references: [restaurantTables.id] }),
  items: many(orderItems),
  payments: many(payments),
  deliveryAssignments: many(deliveryAssignments),
  fiscalInvoices: many(fiscalInvoices),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));

export const modifierGroups = pgTable(
  'modifier_groups',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(), // e.g., "Meat Temperature", "Extra Toppings"
    description: varchar('description', { length: 255 }),
    minSelections: integer('min_selections').default(0).notNull(), // 0 = optional, 1+ = required
    maxSelections: integer('max_selections').default(1).notNull(), // 1 = radio/single, >1 = multiple
    isRequired: boolean('is_required').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('modifier_groups_tenant_idx').on(t.tenantId)]
);

export const modifierOptions = pgTable(
  'modifier_options',
  {
    id: serial('id').primaryKey(),
    modifierGroupId: integer('modifier_group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(), // e.g., "Extra Cheddar", "Well Done"
    priceAdjustment: decimal('price_adjustment', { precision: 10, scale: 2 }).default('0.00').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('modifier_options_group_idx').on(t.modifierGroupId)]
);

export const comboBundles = pgTable(
  'combo_bundles',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 150 }).notNull(), // e.g. "Family Feast Combo", "Burger & Shake Deal"
    description: text('description'),
    sku: varchar('sku', { length: 50 }),
    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('combo_bundles_tenant_idx').on(t.tenantId)]
);

export const comboBundleItems = pgTable(
  'combo_bundle_items',
  {
    id: serial('id').primaryKey(),
    comboId: integer('combo_id').notNull().references(() => comboBundles.id, { onDelete: 'cascade' }),
    menuItemId: integer('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').default(1).notNull(),
    additionalPrice: decimal('additional_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  },
  (t) => [index('combo_items_combo_idx').on(t.comboId)]
);

export const itemPricingRules = pgTable(
  'item_pricing_rules',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    menuItemId: integer('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
    ruleName: varchar('rule_name', { length: 150 }).notNull(), // e.g. "Happy Hour 20% Off", "VIP Lounge Surcharge"
    ruleType: varchar('rule_type', { length: 50 }).notNull().default('FIXED_PRICE'), // 'FIXED_PRICE', 'PERCENTAGE_DISCOUNT', 'SURGE_ADDITION'
    value: decimal('value', { precision: 10, scale: 2 }).notNull(), // Adjusted price or percentage
    startTime: varchar('start_time', { length: 10 }), // e.g. "17:00"
    endTime: varchar('end_time', { length: 10 }), // e.g. "20:00"
    daysOfWeek: varchar('days_of_week', { length: 50 }), // e.g. "MON,TUE,WED,THU,FRI"
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('pricing_rules_tenant_idx').on(t.tenantId),
    index('pricing_rules_item_idx').on(t.menuItemId),
  ]
);

export const menuItemAvailability = pgTable(
  'menu_item_availability',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    menuItemId: integer('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
    is86ed: boolean('is_86ed').default(false).notNull(), // Out of stock / 86ed
    reason: varchar('reason', { length: 150 }), // e.g. "Ran out of Brioche Buns", "86ed by Kitchen Chef"
    remainingCount: integer('remaining_count'), // Nullable: if set, shows countdown (e.g. "Only 4 left")
    autoResetAt: timestamp('auto_reset_at', { withTimezone: true }), // Scheduled restock time
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('item_avail_tenant_idx').on(t.tenantId),
    index('item_avail_menu_item_idx').on(t.menuItemId),
  ]
);

export const recipes = pgTable(
  'recipes',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' }),
    menuItemId: integer('menu_item_id')
      .references(() => menuItems.id, { onDelete: 'cascade' })
      .notNull(),
    version: integer('version').default(1).notNull(),
    prepTimeMinutes: integer('prep_time_minutes').default(15).notNull(),
    cookTimeMinutes: integer('cook_time_minutes').default(10).notNull(),
    yieldPortions: decimal('yield_portions', { precision: 10, scale: 2 }).default('1.00').notNull(),
    instructions: text('instructions'),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('recipes_tenant_menu_item_idx').on(t.tenantId, t.menuItemId, t.isActive),
  ]
);

export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    inventoryItemId: integer('inventory_item_id')
      .references(() => inventoryItems.id, { onDelete: 'restrict' })
      .notNull(),
    quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    wastagePercentage: decimal('wastage_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('recipe_ingredients_recipe_idx').on(t.recipeId),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable = broadcast to tenant/branch
    title: varchar('title', { length: 255 }).notNull(),
    detail: text('detail').notNull(),
    severity: varchar('severity', { length: 30 }).default('INFO').notNull(), // 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'
    module: varchar('module', { length: 50 }).default('SYSTEM').notNull(), // 'INVENTORY', 'KDS', 'POS', 'FINANCE', 'AUTH'
    entityType: varchar('entity_type', { length: 100 }), // e.g. 'inventory_items', 'orders'
    entityId: varchar('entity_id', { length: 100 }), // e.g. item ID or order number
    actionUrl: varchar('action_url', { length: 255 }), // Deep link to module, e.g. '/inventory/items'
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('notifications_tenant_idx').on(t.tenantId),
    index('notifications_unread_idx').on(t.tenantId, t.isRead),
    index('notifications_severity_idx').on(t.tenantId, t.severity),
  ]
);

// 1. STORAGE ZONES / WAREHOUSE AREAS (SAP Storage Types / NetSuite Zones)
export const warehouseZones = pgTable(
  'warehouse_zones',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    zoneCode: varchar('zone_code', { length: 30 }).notNull(), // e.g., 'ZONE-CHILLER-01', 'AMB-DRY-MAIN'
    name: varchar('name', { length: 120 }).notNull(), // e.g., 'Cold-Chain Dairy Chiller', 'Main Bulk Dry Storeroom'
    zoneType: varchar('zone_type', { length: 40 }).notNull().default('INTERNAL_STORAGE'), // 'RECEIVING', 'INTERNAL_STORAGE', 'COLD_STORAGE', 'DEEP_FREEZE', 'STAGING_DISPATCH', 'QUARANTINE_SCRAP'
    temperatureMinC: numeric('temperature_min_c', { precision: 5, scale: 2 }),
    temperatureMaxC: numeric('temperature_max_c', { precision: 5, scale: 2 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('warehouse_zones_tenant_idx').on(t.tenantId),
    index('warehouse_zones_branch_idx').on(t.tenantId, t.branchId),
    index('warehouse_zones_code_idx').on(t.tenantId, t.zoneCode),
  ]
);

// 2. GRANULAR STORAGE BINS / SLOTS (SAP Bin Master Data / NetSuite Bins)
export const warehouseBins = pgTable(
  'warehouse_bins',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    zoneId: integer('zone_id')
      .notNull()
      .references(() => warehouseZones.id, { onDelete: 'cascade' }),
    binCode: varchar('bin_code', { length: 40 }).notNull(), // e.g., 'A01-R02-S03-B04'
    barcode: varchar('barcode', { length: 80 }), // e.g., 'BIN-CBD-A01-02'
    binType: varchar('bin_type', { length: 30 }).notNull().default('STANDARD_SHELF'), // 'STANDARD_SHELF', 'PALLET_RACK', 'FLOOR_BULK', 'LOCKER', 'REEFER_BIN'
    pickSequence: integer('pick_sequence').notNull().default(10), // Optimized order picking wave route
    maxWeightKg: numeric('max_weight_kg', { precision: 10, scale: 2 }).notNull().default('500.00'),
    maxVolumeCbm: numeric('max_volume_cbm', { precision: 8, scale: 3 }).notNull().default('1.500'),
    isQuarantine: boolean('is_quarantine').notNull().default(false), // Replaces scrap / damaged items isolation
    isOccupied: boolean('is_occupied').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('warehouse_bins_tenant_idx').on(t.tenantId),
    index('warehouse_bins_zone_idx').on(t.zoneId),
    index('warehouse_bins_code_idx').on(t.tenantId, t.binCode),
  ]
);

// ============================================================================
// WORKFORCE ROSTERING & SHIFT SCHEDULING (HCM / WFM)
// ============================================================================

export const shiftTemplates = pgTable(
  'shift_templates',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }).notNull(), // e.g. "Morning Opening", "Floor Midday", "Closing"
    startTime: varchar('start_time', { length: 5 }).notNull(), // "07:00"
    endTime: varchar('end_time', { length: 5 }).notNull(), // "15:30"
    breakMinutes: integer('break_minutes').default(30).notNull(),
    colorHex: varchar('color_hex', { length: 20 }).default('#0554F4').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('shift_templates_tenant_idx').on(t.tenantId),
  ]
);

export const workSchedules = pgTable(
  'work_schedules',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    templateId: integer('template_id').references(() => shiftTemplates.id, { onDelete: 'set null' }),
    shiftDate: date('shift_date').notNull(), // "YYYY-MM-DD"
    startTime: varchar('start_time', { length: 5 }).notNull(), // "08:00"
    endTime: varchar('end_time', { length: 5 }).notNull(), // "16:30"
    breakMinutes: integer('break_minutes').default(30).notNull(),
    role: varchar('role', { length: 100 }).notNull(), // Operational clearance for this shift
    hourlyWage: numeric('hourly_wage', { precision: 12, scale: 2 }).default('0.00'),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT | PUBLISHED | CONFIRMED | CANCELLED
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('work_schedules_tenant_idx').on(t.tenantId),
    index('work_schedules_tenant_date_idx').on(t.tenantId, t.shiftDate),
    index('work_schedules_user_idx').on(t.userId),
    index('work_schedules_branch_idx').on(t.branchId),
  ]
);

// ============================================================================
// WORKFORCE TIME & ATTENDANCE LEDGER (HCM / TIME TRACKING)
// ============================================================================

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    scheduleId: integer('schedule_id')
      .references(() => workSchedules.id, { onDelete: 'set null' }), // Links planned shift to actual attendance
    clockInAt: timestamp('clock_in_at', { withTimezone: true }).notNull(),
    clockOutAt: timestamp('clock_out_at', { withTimezone: true }),
    clockInMethod: varchar('clock_in_method', { length: 50 }).default('PIN').notNull(), // PIN | BIOMETRIC | PORTAL | NFC | MANUAL_OVERRIDE
    clockOutMethod: varchar('clock_out_method', { length: 50 }),
    breakMinutes: integer('break_minutes').default(0).notNull(),
    totalDurationMinutes: integer('total_duration_minutes').default(0).notNull(),
    regularHours: numeric('regular_hours', { precision: 6, scale: 2 }).default('0.00').notNull(),
    overtimeHours: numeric('overtime_hours', { precision: 6, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 50 }).default('ON_DUTY').notNull(), // ON_DUTY | COMPLETED | PENDING_REVIEW | APPROVED | REJECTED
    verificationStatus: varchar('verification_status', { length: 50 }).default('VERIFIED').notNull(), // VERIFIED | LATE_ARRIVAL | EARLY_DEPARTURE | TIME_DISPUTE | MANUAL_ADJUSTMENT
    deviceInfo: varchar('device_info', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    notes: text('notes'),
    approvedByUserId: integer('approved_by_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('attendance_tenant_idx').on(t.tenantId),
    index('attendance_tenant_user_idx').on(t.tenantId, t.userId),
    index('attendance_tenant_branch_idx').on(t.tenantId, t.branchId),
    index('attendance_clock_in_idx').on(t.tenantId, t.clockInAt),
    index('attendance_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// MANAGER SHIFT HANDOVERS & OPERATIONAL LOGBOOK (HCM / WFM)
// ============================================================================

export const shiftHandovers = pgTable(
  'shift_handovers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    outgoingManagerId: integer('outgoing_manager_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    incomingManagerId: integer('incoming_manager_id')
      .references(() => users.id, { onDelete: 'set null' }),
    shiftType: varchar('shift_type', { length: 50 }).notNull(), // MORNING | MIDDAY | EVENING | NIGHT_CLOSING
    handoverDate: date('handover_date').notNull(), // YYYY-MM-DD
    cashStatus: varchar('cash_status', { length: 50 }).default('BALANCED').notNull(), // BALANCED | DISCREPANCY_SHORT | DISCREPANCY_OVER
    openingFloat: numeric('opening_float', { precision: 12, scale: 2 }).default('0.00').notNull(),
    closingCash: numeric('closing_cash', { precision: 12, scale: 2 }).default('0.00').notNull(),
    cashVariance: numeric('cash_variance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    operationalIncidents: text('operational_incidents'),
    inventoryKitchenNotes: text('inventory_kitchen_notes'),
    hardwareMaintenanceNotes: text('hardware_maintenance_notes'),
    guestExperienceNotes: text('guest_experience_notes'),
    checklistItems: jsonb('checklist_items')
      .$type<{ id: string; text: string; completed: boolean }[]>()
      .default([])
      .notNull(),
    status: varchar('status', { length: 50 }).default('SUBMITTED').notNull(), // DRAFT | SUBMITTED | ACKNOWLEDGED | DISPUTED
    outgoingSignedAt: timestamp('outgoing_signed_at', { withTimezone: true }).defaultNow().notNull(),
    incomingSignedAt: timestamp('incoming_signed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('shift_handovers_tenant_idx').on(t.tenantId),
    index('shift_handovers_tenant_date_idx').on(t.tenantId, t.handoverDate),
    index('shift_handovers_tenant_branch_idx').on(t.tenantId, t.branchId),
    index('shift_handovers_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// CASH DRAWER CUSTODIANS & CASHIER ASSIGNMENTS (HCM / TREASURY)
// ============================================================================

export const cashierAssignments = pgTable(
  'cashier_assignments',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    cashDrawerId: integer('cash_drawer_id')
      .references(() => cashDrawers.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    assignedByUserId: integer('assigned_by_user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    assignmentDate: date('assignment_date').notNull(), // YYYY-MM-DD
    shiftType: varchar('shift_type', { length: 50 }).default('MORNING').notNull(), // MORNING | MIDDAY | EVENING | NIGHT_CLOSING
    status: varchar('status', { length: 50 }).default('ASSIGNED').notNull(), // ASSIGNED | ACTIVE | RELEASED | REVOKED
    allocatedFloat: numeric('allocated_float', { precision: 12, scale: 2 }).default('0.00').notNull(),
    maxCashLimit: numeric('max_cash_limit', { precision: 12, scale: 2 }).default('50000.00').notNull(), // Threshold triggering mandatory safe drop
    allowRefunds: boolean('allow_refunds').default(false).notNull(),
    allowDrawerPop: boolean('allow_drawer_pop').default(true).notNull(),
    allowManualDiscount: boolean('allow_manual_discount').default(false).notNull(),
    maxDiscountPercent: integer('max_discount_percent').default(0).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    handoverNotes: text('handover_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('cashier_assignments_tenant_idx').on(t.tenantId),
    index('cashier_assignments_tenant_date_idx').on(t.tenantId, t.assignmentDate),
    index('cashier_assignments_drawer_idx').on(t.cashDrawerId),
    index('cashier_assignments_user_idx').on(t.userId),
    index('cashier_assignments_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// EMPLOYEE PERFORMANCE APPRAISALS & KPI METRICS (HCM / TALENT MANAGEMENT)
// ============================================================================

export const staffPerformanceReviews = pgTable(
  'staff_performance_reviews',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    reviewerId: integer('reviewer_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    reviewCycle: varchar('review_cycle', { length: 50 }).default('MONTHLY').notNull(), // MONTHLY | QUARTERLY | BIANNUAL | ANNUAL
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    overallRating: numeric('overall_rating', { precision: 3, scale: 2 }).default('4.00').notNull(), // 1.00 - 5.00 Scale
    // Core Operational KPIs
    totalSalesGenerated: numeric('total_sales_generated', { precision: 12, scale: 2 }).default('0.00').notNull(),
    salesTarget: numeric('sales_target', { precision: 12, scale: 2 }).default('0.00').notNull(),
    averageTicketValue: numeric('average_ticket_value', { precision: 10, scale: 2 }).default('0.00').notNull(),
    speedOfServiceMinutes: numeric('speed_of_service_minutes', { precision: 5, scale: 1 }).default('0.0').notNull(),
    attendanceScorePercent: integer('attendance_score_percent').default(100).notNull(),
    voidRefundCount: integer('void_refund_count').default(0).notNull(),
    tipPoolAllocated: numeric('tip_pool_allocated', { precision: 10, scale: 2 }).default('0.00').notNull(),
    // Competency Matrices (Communication, Punctuality, Culinary/Service Quality, Leadership)
    competencies: jsonb('competencies')
      .$type<{ category: string; rating: number; comments: string }[]>()
      .default([])
      .notNull(),
    // SMART Goals & Development Objectives
    goals: jsonb('goals')
      .$type<{ id: string; title: string; targetDate: string; completed: boolean }[]>()
      .default([])
      .notNull(),
    managerFeedback: text('manager_feedback'),
    employeeFeedback: text('employee_feedback'),
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT | SUBMITTED | ACKNOWLEDGED | FINALIZED
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('perf_reviews_tenant_idx').on(t.tenantId),
    index('perf_reviews_user_idx').on(t.userId),
    index('perf_reviews_cycle_idx').on(t.tenantId, t.reviewCycle),
    index('perf_reviews_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// FINANCIAL SETTINGS, STATUTORY TAX CODES & FISCAL DEVICES (FIN / HCM)
// ============================================================================

export const tenantFinancialSettings = pgTable(
  'tenant_financial_settings',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    baseCurrency: varchar('base_currency', { length: 10 }).default('KES').notNull(),
    fiscalYearStartMonth: integer('fiscal_year_start_month').default(1).notNull(), // 1 = January
    taxPin: varchar('tax_pin', { length: 50 }), // e.g. KRA PIN (P051234567X)
    isVatInclusive: boolean('is_vat_inclusive').default(true).notNull(), // Prices display inclusive of VAT
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('16.00').notNull(), // Standard VAT (16%)
    isCateringLevyEnabled: boolean('is_catering_levy_enabled').default(true).notNull(),
    cateringLevyRate: numeric('catering_levy_rate', { precision: 5, scale: 2 }).default('2.00').notNull(), // Tourism & Catering Levy (2%)
    isServiceChargeEnabled: boolean('is_service_charge_enabled').default(false).notNull(),
    serviceChargeRate: numeric('service_charge_rate', { precision: 5, scale: 2 }).default('5.00').notNull(),
    // Fiscal Device & eTIMS Architecture
    etimsEnvironment: varchar('etims_environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    autoFiscalizeOnPayment: boolean('auto_fiscalize_on_payment').default(true).notNull(),
    etimsMiddleServerUrl: varchar('etims_middle_server_url', { length: 255 }),
    etimsDeviceSerial: varchar('etims_device_serial', { length: 100 }), // e.g. OSCU-SDC-2026-001
    etimsBranchCode: varchar('etims_branch_code', { length: 20 }).default('00').notNull(), // Default primary branch (00)
    allowOfflineFiscalSign: boolean('allow_offline_fiscal_sign').default(true).notNull(),
    // HCM Labor & Tip Pooling Governance
    tipDistributionModel: varchar('tip_distribution_model', { length: 50 }).default('HOURS_WEIGHTED').notNull(), // HOURS_WEIGHTED | EQUAL_SPLIT | ROLE_WEIGHTED
    defaultOvertimeMultiplier: numeric('default_overtime_multiplier', { precision: 4, scale: 2 }).default('1.50').notNull(),
    holidayOvertimeMultiplier: numeric('holiday_overtime_multiplier', { precision: 4, scale: 2 }).default('2.00').notNull(),
    standardWorkWeekHours: integer('standard_work_week_hours').default(40).notNull(),
    // Treasury & Safe Drop Fiduciary Guardrails
    maxDrawerCashThreshold: numeric('max_drawer_cash_threshold', { precision: 12, scale: 2 }).default('50000.00').notNull(),
    enableSafeDropAlerts: boolean('enable_safe_drop_alerts').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('fin_settings_tenant_idx').on(t.tenantId),
  ]
);

export const taxCodes = pgTable(
  'tax_codes',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    code: varchar('code', { length: 20 }).notNull(), // e.g. "VAT-16", "EXEMPT", "ZERO-RATED"
    name: varchar('name', { length: 100 }).notNull(),
    rate: numeric('rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    statutoryCode: varchar('statutory_code', { length: 20 }), // e.g. KRA eTIMS Tax Code "A", "B", "C", "E"
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('tax_codes_tenant_idx').on(t.tenantId),
  ]
);

// ============================================================================
// HOSPITALITY SERVICE MODELS & FOH REVENUE CENTERS (OPS / FOH)
// ============================================================================

export const serviceModels = pgTable(
  'service_models',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide templates
    name: varchar('name', { length: 100 }).notNull(), // e.g., "Full Table Service", "Express Counter", "Lounge & Bar Tab", "Drive-Thru"
    type: varchar('type', { length: 50 }).notNull(), // DINE_IN | QUICK_SERVICE | BAR_TAB | TAKEAWAY | DELIVERY | DRIVE_THRU
    description: text('description'),
    // Workflow & Guest Sequencing Flags
    requiresTable: boolean('requires_table').default(true).notNull(),
    payBeforeOrder: boolean('pay_before_order').default(false).notNull(), // Pre-pay (QSR) vs Post-pay (Dine-in)
    promptGuestCount: boolean('prompt_guest_count').default(true).notNull(),
    allowSplitChecks: boolean('allow_split_checks').default(true).notNull(),
    allowTableTransfers: boolean('allow_table_transfers').default(true).notNull(),
    // Kitchen Display (KDS) & Expediter Rules
    autoSendToKitchen: boolean('auto_send_to_kitchen').default(false).notNull(),
    enableCoursePacing: boolean('enable_course_pacing').default(false).notNull(), // Starters, Mains, Desserts
    requireSeatNumbering: boolean('require_seat_numbering').default(false).notNull(),
    // Surcharges & Gratuity
    autoApplyServiceCharge: boolean('auto_apply_service_charge').default(false).notNull(),
    serviceChargePercent: numeric('service_charge_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    packingChargeAmount: numeric('packing_charge_amount', { precision: 8, scale: 2 }).default('0.00').notNull(),
    // Bar & Tab Fiduciary Controls
    preAuthCardRequired: boolean('pre_auth_card_required').default(false).notNull(),
    maxTabCreditLimit: numeric('max_tab_credit_limit', { precision: 12, scale: 2 }).default('0.00').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('service_models_tenant_idx').on(t.tenantId),
    index('service_models_type_idx').on(t.tenantId, t.type),
  ]
);

// ============================================================================
// RECEIPT TEMPLATES & THERMAL INVOICE FORMATTING (OPS / POS)
// ============================================================================

export const receiptTemplates = pgTable(
  'receipt_templates',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable for global tenant default
    name: varchar('name', { length: 100 }).notNull(), // e.g. "Standard 80mm Dining Bill", "58mm Bar Slip", "A4 Corporate Tax Invoice"
    isDefault: boolean('is_default').default(false).notNull(),
    paperWidth: varchar('paper_width', { length: 20 }).default('80MM').notNull(), // 80MM | 58MM | A4_INVOICE
    fontScale: varchar('font_scale', { length: 20 }).default('NORMAL').notNull(), // COMPACT | NORMAL | LARGE
    // Header & Identity Configuration
    headerTitle: varchar('header_title', { length: 150 }).notNull(),
    headerSubtitle: varchar('header_subtitle', { length: 255 }),
    showLogo: boolean('show_logo').default(true).notNull(),
    showBranchAddress: boolean('show_branch_address').default(true).notNull(),
    showTaxPin: boolean('show_tax_pin').default(true).notNull(),
    showContactPhone: boolean('show_contact_phone').default(true).notNull(),
    showContactEmail: boolean('show_contact_email').default(false).notNull(),
    // Transaction & Staff Metadata
    showCashierName: boolean('show_cashier_name').default(true).notNull(),
    showServerName: boolean('show_server_name').default(true).notNull(),
    showTableNumber: boolean('show_table_number').default(true).notNull(),
    showCustomerDetails: boolean('show_customer_details').default(true).notNull(),
    showOrderType: boolean('show_order_type').default(true).notNull(),
    // Line Item & Kitchen Attributes
    showItemSku: boolean('show_item_sku').default(false).notNull(),
    showItemModifiers: boolean('show_item_modifiers').default(true).notNull(),
    showKitchenNotes: boolean('show_kitchen_notes').default(false).notNull(),
    // Tax, Settlement & eTIMS Compliance
    showTaxSummary: boolean('show_tax_summary').default(true).notNull(),
    showEtimsQrCode: boolean('show_etims_qr_code').default(true).notNull(),
    showFiscalDeviceSerial: boolean('show_fiscal_device_serial').default(true).notNull(),
    showPaymentBreakdown: boolean('show_payment_breakdown').default(true).notNull(),
    showChangeDue: boolean('show_change_due').default(true).notNull(),
    showTipPromptLine: boolean('show_tip_prompt_line').default(false).notNull(),
    showLoyaltyPoints: boolean('show_loyalty_points').default(true).notNull(),
    // Footer & Customer Messaging
    footerMessage: text('footer_message'),
    returnPolicy: text('return_policy'),
    wifiDetails: varchar('wifi_details', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('receipt_templates_tenant_idx').on(t.tenantId),
    index('receipt_templates_branch_idx').on(t.branchId),
  ]
);

// ============================================================================
// NETWORK HARDWARE, KITCHEN PRINTERS & PERIPHERALS (OPS / HARDWARE)
// ============================================================================

export const networkPrinters = pgTable(
  'network_printers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(), // e.g. "Main Cashier Till Printer", "Hot Kitchen Grill Printer", "Bar Dispense"
    deviceType: varchar('device_type', { length: 50 }).notNull(), // RECEIPT | KITCHEN | BAR | LABEL | FISCAL_BOX
    connectionType: varchar('connection_type', { length: 50 }).default('NETWORK_TCP').notNull(), // NETWORK_TCP | USB | BLUETOOTH | SERIAL
    ipAddress: varchar('ip_address', { length: 64 }), // e.g. "192.168.1.200"
    port: integer('port').default(9100).notNull(), // Standard RAW ESC/POS port
    macAddress: varchar('mac_address', { length: 64 }),
    driverProtocol: varchar('driver_protocol', { length: 50 }).default('ESC_POS').notNull(), // ESC_POS | STAR_LINE | TSPL | EPSON_XML
    paperWidth: varchar('paper_width', { length: 20 }).default('80MM').notNull(), // 80MM | 58MM
    autoCut: boolean('auto_cut').default(true).notNull(),
    openCashDrawerOnPrint: boolean('open_cash_drawer_on_print').default(false).notNull(),
    beepOnPrint: boolean('beep_on_print').default(false).notNull(),
    beepCount: integer('beep_count').default(1).notNull(),
    backupPrinterId: integer('backup_printer_id'), // Automatic failover redirect if device is unreachable
    assignedStations: jsonb('assigned_stations')
      .$type<string[]>()
      .default([])
      .notNull(), // e.g. ["GRILL", "FRYER", "COLD_PREP", "BAR"]
    status: varchar('status', { length: 50 }).default('ONLINE').notNull(), // ONLINE | OFFLINE | ERROR | UNKNOWN
    lastPingAt: timestamp('last_ping_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('network_printers_tenant_idx').on(t.tenantId),
    index('network_printers_branch_idx').on(t.branchId),
    index('network_printers_type_idx').on(t.tenantId, t.deviceType),
  ]
);

// ============================================================================
// KDS STATIONS, ORDER ROUTING RULES & CULINARY SLA (OPS / KITCHEN)
// ============================================================================

export const kitchenStations = pgTable(
  'kitchen_stations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(), // e.g. "Hot Grill & Broiler", "Cold Pantry & Salads", "Master Expediter"
    code: varchar('code', { length: 50 }).notNull(), // e.g. "KDS-GRILL", "KDS-COLD", "KDS-EXPO"
    stationType: varchar('station_type', { length: 50 }).default('PREP').notNull(), // PREP | EXPEDITER | PASS | BAR | PACKING
    colorHex: varchar('color_hex', { length: 20 }).default('#0554F4').notNull(),
    targetPrepTimeMinutes: integer('target_prep_time_minutes').default(15).notNull(), // Standard target cook duration
    warningTimeMinutes: integer('warning_time_minutes').default(10).notNull(), // Amber alert threshold
    criticalTimeMinutes: integer('critical_time_minutes').default(18).notNull(), // Flashing red overdue alert
    assignedCategories: jsonb('assigned_stations')
      .$type<string[]>()
      .default([])
      .notNull(), // e.g. ["Steaks & Grill", "Burgers", "Hot Sides"]
    autoBumpOnPrint: boolean('auto_bump_on_print').default(false).notNull(),
    soundAlertOnNewTicket: boolean('sound_alert_on_new_ticket').default(true).notNull(),
    allowTicketRecall: boolean('allow_ticket_recall').default(true).notNull(),
    backupStationId: integer('backup_station_id'), // Automatic failover redirect if station terminal drops
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('kitchen_stations_tenant_idx').on(t.tenantId),
    index('kitchen_stations_branch_idx').on(t.branchId),
    index('kitchen_stations_type_idx').on(t.tenantId, t.stationType),
  ]
);

export const kitchenGlobalSettings = pgTable(
  'kitchen_global_settings',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    defaultWarningMinutes: integer('default_warning_minutes').default(10).notNull(),
    defaultCriticalMinutes: integer('default_critical_minutes').default(18).notNull(),
    enableCoursePacing: boolean('enable_course_pacing').default(true).notNull(), // Hold mains until starters are bumped
    enableOrderConsolidation: boolean('enable_order_consolidation').default(true).notNull(), // Group identical SKUs across tickets
    vipPriorityBoostMinutes: integer('vip_priority_boost_minutes').default(5).notNull(), // Subtract from timer to prioritize
    deliveryPriorityBoostMinutes: integer('delivery_priority_boost_minutes').default(3).notNull(),
    soundVolume: integer('sound_volume').default(80).notNull(), // 0 - 100%
    autoArchiveCompletedMinutes: integer('auto_archive_completed_minutes').default(120).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('kitchen_global_tenant_idx').on(t.tenantId),
  ]
);

// ============================================================================
// PAYMENT INTEGRATION GATEWAYS & TRANSACTION ADAPTERS (FIN / PAYMENTS)
// ============================================================================

export const paymentIntegrations = pgTable(
  'payment_integrations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide gateway
    provider: varchar('provider', { length: 50 }).notNull(), // MPESA_DARAJA | STRIPE | PESAPAL | DPO_PAY | FLUTTERWAVE | ADYEN | MANUAL_PDQ
    title: varchar('title', { length: 100 }).notNull(), // e.g. "Main M-Pesa Buy Goods Till", "Stripe Card Terminal Gateway"
    environment: varchar('environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    // Gateway Credentials & Cryptographic Secrets
    merchantIdentifier: varchar('merchant_identifier', { length: 100 }).notNull(), // Paybill/Till number, Stripe Account ID, Merchant ID
    apiKey: text('api_key').notNull(), // Consumer Key / Public Key
    apiSecret: text('api_secret').notNull(), // Consumer Secret / Restricted Secret Key
    passKey: text('pass_key'), // Daraja Online Passkey / Webhook Secret Key
    webhookSecret: text('webhook_secret'),
    callbackUrl: text('callback_url'),
    // Routing & Settlement Preferences
    supportedCurrencies: jsonb('supported_currencies')
      .$type<string[]>()
      .default(['KES'])
      .notNull(),
    autoReconcile: boolean('auto_reconcile').default(true).notNull(),
    settlementAccountCode: varchar('settlement_account_code', { length: 50 }), // General Ledger bank clearing account code
    surchargePercent: numeric('surcharge_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    // Health & Audit Metrics
    status: varchar('status', { length: 50 }).default('INACTIVE').notNull(), // ACTIVE | INACTIVE | ERROR | SUSPENDED
    lastHandshakeAt: timestamp('last_handshake_at', { withTimezone: true }),
    lastHandshakeStatus: varchar('last_handshake_status', { length: 50 }),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('payment_integrations_tenant_idx').on(t.tenantId),
    index('payment_integrations_branch_idx').on(t.branchId),
    index('payment_integrations_provider_idx').on(t.tenantId, t.provider),
    index('payment_integrations_status_idx').on(t.tenantId, t.status),
  ]
);

export const paymentWebhookLogs = pgTable(
  'payment_webhook_logs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    integrationId: integer('integration_id')
      .references(() => paymentIntegrations.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(), // e.g. "C2B_VALIDATION", "STK_CALLBACK", "PAYMENT_INTENT_SUCCEEDED"
    externalReference: varchar('external_reference', { length: 100 }), // Transaction ID (e.g. M-Pesa Receipt Number)
    payload: jsonb('payload').notNull(),
    responseCode: integer('response_code').default(200).notNull(),
    status: varchar('status', { length: 50 }).default('PROCESSED').notNull(), // PROCESSED | FAILED | REJECTED
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('payment_webhooks_tenant_idx').on(t.tenantId),
    index('payment_webhooks_integration_idx').on(t.integrationId),
  ]
);

// ============================================================================
// ENTERPRISE MESSAGING, SMS & NOTIFICATION GATEWAYS (HCM / COMMS)
// ============================================================================

export const messagingIntegrations = pgTable(
  'messaging_integrations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide gateways
    channel: varchar('channel', { length: 30 }).notNull(), // SMS | WHATSAPP | EMAIL | WEBHOOK
    provider: varchar('provider', { length: 50 }).notNull(), // AFRICAS_TALKING | TWILIO | ADVANTA_SMS | SAFARICOM_BULK_SMS | INFOBIP | SENDGRID | RESEND | AWS_SES | CUSTOM_WEBHOOK
    title: varchar('title', { length: 100 }).notNull(),
    environment: varchar('environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    // Gateway Credentials & Originator Attributes
    senderId: varchar('sender_id', { length: 50 }), // Alphanumeric Sender ID or WhatsApp verified number
    accountIdentifier: varchar('account_identifier', { length: 150 }).notNull(), // Username / Account SID / App ID
    apiKey: text('api_key').notNull(), // Primary API token / Auth token
    apiSecret: text('api_secret'), // Optional private secret / webhook signing secret
    webhookUrl: text('webhook_url'), // Inbound delivery report (DLR) webhook
    // Quota & Rate Guardrails
    monthlyCreditCap: integer('monthly_credit_cap').default(0).notNull(), // 0 = unlimited
    currentMonthDispatches: integer('current_month_dispatches').default(0).notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE | INACTIVE | ERROR | SUSPENDED
    lastHandshakeAt: timestamp('last_handshake_at', { withTimezone: true }),
    lastHandshakeStatus: varchar('last_handshake_status', { length: 50 }),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('messaging_integrations_tenant_idx').on(t.tenantId),
    index('messaging_integrations_channel_idx').on(t.tenantId, t.channel),
    index('messaging_integrations_provider_idx').on(t.tenantId, t.provider),
    index('messaging_integrations_status_idx').on(t.tenantId, t.status),
  ]
);

export const messagingTemplates = pgTable(
  'messaging_templates',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    triggerEvent: varchar('trigger_event', { length: 100 }).notNull(), // SHIFT_SCHEDULED | SHIFT_REMINDER | LATE_CLOCK_IN | HANDOVER_PENDING | RECEIPT_DISPATCH | SAFE_DROP_ALERT
    channel: varchar('channel', { length: 30 }).notNull(), // SMS | WHATSAPP | EMAIL
    subject: varchar('subject', { length: 200 }), // Required for EMAIL channel
    bodyTemplate: text('body_template').notNull(), // Contains merge tags: {{employee_name}}, {{shift_date}}, {{start_time}}, etc.
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('messaging_templates_tenant_idx').on(t.tenantId),
    index('messaging_templates_event_idx').on(t.tenantId, t.triggerEvent),
  ]
);

export const messagingLogs = pgTable(
  'messaging_logs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    integrationId: integer('integration_id')
      .references(() => messagingIntegrations.id, { onDelete: 'set null' }),
    recipient: varchar('recipient', { length: 150 }).notNull(), // Phone number or email
    channel: varchar('channel', { length: 30 }).notNull(),
    triggerEvent: varchar('trigger_event', { length: 100 }),
    bodyContent: text('body_content').notNull(),
    externalMessageId: varchar('external_message_id', { length: 150 }),
    status: varchar('status', { length: 50 }).default('DELIVERED').notNull(), // QUEUED | SENT | DELIVERED | FAILED
    costUnits: numeric('cost_units', { precision: 8, scale: 2 }).default('1.00').notNull(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('messaging_logs_tenant_idx').on(t.tenantId),
    index('messaging_logs_recipient_idx').on(t.tenantId, t.recipient),
    index('messaging_logs_dispatched_idx').on(t.tenantId, t.dispatchedAt),
  ]
);

// ============================================================================
// OMNICHANNEL ORDER INTEGRATIONS & AGGREGATORS (OPS / COMMERCE)
// ============================================================================

export const orderIntegrations = pgTable(
  'order_integrations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide templates
    channel: varchar('channel', { length: 50 }).notNull(), // GLOVO | UBER_EATS | BOLT_FOOD | DOORDASH | SHOPIFY | WOOCOMMERCE | CUSTOM_WEBHOOK
    title: varchar('title', { length: 100 }).notNull(),
    environment: varchar('environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    // Gateway Credentials & Store Identification
    storeIdentifier: varchar('store_identifier', { length: 150 }).notNull(), // External Store UUID / Aggregator Location ID
    apiKey: text('api_key').notNull(),
    apiSecret: text('api_secret'),
    webhookSecret: text('webhook_secret'),
    callbackUrl: text('callback_url'),
    // Automation & Operational Pacing
    autoAcceptOrders: boolean('auto_accept_orders').default(false).notNull(),
    autoSendToKitchen: boolean('auto_send_to_kitchen').default(true).notNull(),
    priceMarkupPercent: numeric('price_markup_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    defaultPrepTimeMinutes: integer('default_prep_time_minutes').default(20).notNull(),
    // Status & Telemetry
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE | INACTIVE | PAUSED | ERROR
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastSyncStatus: varchar('last_sync_status', { length: 50 }),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('order_integrations_tenant_idx').on(t.tenantId),
    index('order_integrations_branch_idx').on(t.branchId),
    index('order_integrations_channel_idx').on(t.tenantId, t.channel),
    index('order_integrations_status_idx').on(t.tenantId, t.status),
  ]
);

export const orderIntegrationLogs = pgTable(
  'order_integration_logs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    integrationId: integer('integration_id')
      .references(() => orderIntegrations.id, { onDelete: 'cascade' })
      .notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(), // ORDER_CREATED | ORDER_UPDATED | ORDER_CANCELLED | MENU_SYNC | STORE_STATUS
    externalOrderId: varchar('external_order_id', { length: 150 }),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).default('SUCCESS').notNull(), // SUCCESS | FAILED | REJECTED | IGNORED
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('order_logs_tenant_idx').on(t.tenantId),
    index('order_logs_integration_idx').on(t.integrationId),
    index('order_logs_received_idx').on(t.tenantId, t.receivedAt),
  ]
);

// ============================================================================
// ENTERPRISE AUDIT TRAIL, SECURITY & COMPLIANCE LOGS (HCM / GOVERNANCE)
// ============================================================================


export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // e.g. ORDER_VOIDED, STOCK_ADJUSTED, MPESA_CLAIMED
    module: varchar('module', { length: 50 }).notNull(), // POS, INVENTORY, FINANCE, AUTH
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    reason: text('reason'),
    previousValues: jsonb('previous_values'),
    newValues: jsonb('new_values'),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('audit_logs_tenant_created_idx').on(t.tenantId, t.createdAt),
    index('audit_logs_entity_idx').on(t.tenantId, t.entityType, t.entityId),
  ]
);

// ============================================================================
// OFFLINE SURVIVABILITY, LOCAL CACHE & SYNC ENGINE (OPS / RESILIENCE)
// ============================================================================

export const offlineSettings = pgTable(
  'offline_settings',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }), // Nullable for global tenant policy
    allowOfflineSales: boolean('allow_offline_sales').default(true).notNull(),
    maxOfflineHours: integer('max_offline_hours').default(72).notNull(), // Maximum disconnected operational window
    maxOfflineTicketTotal: numeric('max_offline_ticket_total', { precision: 12, scale: 2 }).default('50000.00').notNull(),
    maxOfflineCumulativeBalance: numeric('max_offline_cumulative_balance', { precision: 14, scale: 2 }).default('500000.00').notNull(),
    requireManagerAuthForOffline: boolean('require_manager_auth_for_offline').default(false).notNull(),
    conflictResolutionStrategy: varchar('conflict_resolution_strategy', { length: 50 }).default('SERVER_TIMESTAMP_WINS').notNull(), // SERVER_TIMESTAMP_WINS | CLIENT_TIMESTAMP_WINS | MANUAL_REVIEW
    autoSyncOnReconnect: boolean('auto_sync_on_reconnect').default(true).notNull(),
    syncBatchSize: integer('sync_batch_size').default(50).notNull(), // Number of orders batched per sync dispatch
    syncIntervalSeconds: integer('sync_interval_seconds').default(30).notNull(),
    // Cache & Local Storage Policies
    cacheCatalogItems: boolean('cache_catalog_items').default(true).notNull(),
    cacheCustomerDirectory: boolean('cache_customer_directory').default(true).notNull(),
    cacheTaxTables: boolean('cache_tax_tables').default(true).notNull(),
    cacheUserCredentials: boolean('cache_user_credentials').default(true).notNull(), // Offline PIN authentication
    encryptLocalStorage: boolean('encrypt_local_storage').default(true).notNull(),
    // Tender Restrictions when Offline
    allowOfflineCash: boolean('allow_offline_cash').default(true).notNull(),
    allowOfflineCard: boolean('allow_offline_card').default(true).notNull(), // Store-and-forward card vouchers
    allowOfflineMpesaReference: boolean('allow_offline_mpesa_reference').default(true).notNull(), // Manual code entry pending background IPN validation
    allowOfflineGiftCards: boolean('allow_offline_gift_cards').default(false).notNull(),
    allowOfflineCreditTabs: boolean('allow_offline_credit_tabs').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('offline_settings_tenant_idx').on(t.tenantId),
    index('offline_settings_branch_idx').on(t.branchId),
  ]
);

export const offlineSyncBatches = pgTable(
  'offline_sync_batches',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    terminalIdentifier: varchar('terminal_identifier', { length: 100 }).notNull(),
    batchReference: varchar('batch_reference', { length: 100 }).notNull(),
    recordCount: integer('record_count').default(0).notNull(),
    status: varchar('status', { length: 50 }).default('PROCESSED').notNull(), // PENDING | PROCESSED | CONFLICT_DETECTED | FAILED
    conflictCount: integer('conflict_count').default(0).notNull(),
    payloadSummary: jsonb('payload_summary'),
    syncDurationMs: integer('sync_duration_ms').default(0).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('offline_sync_tenant_idx').on(t.tenantId),
    index('offline_sync_terminal_idx').on(t.terminalIdentifier),
    index('offline_sync_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// DEVICE TRUST, TERMINAL REGISTRATION & HARDWARE FLEET (MDM / OPS)
// ============================================================================

export const posDevices = pgTable(
  'pos_devices',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 120 }).notNull(), // e.g. "Terminal 01 - Main Counter", "Expediter Screen 01"
    deviceCode: varchar('device_code', { length: 50 }).notNull(), // Unique terminal code e.g. "POS-TERM-001"
    deviceType: varchar('device_type', { length: 50 }).default('POS_TERMINAL').notNull(), // POS_TERMINAL | KDS_DISPLAY | WAITER_TABLET | SELF_ORDER_KIOSK | BARCODE_SCANNER | MANAGER_STATION
    operatingSystem: varchar('operating_system', { length: 50 }).default('WEB_BROWSER').notNull(), // ANDROID | IOS | WINDOWS | LINUX | WEB_BROWSER
    hardwareFingerprint: varchar('hardware_fingerprint', { length: 255 }), // SHA-256 client fingerprint
    ipAddress: varchar('ip_address', { length: 64 }),
    macAddress: varchar('mac_address', { length: 64 }),
    appVersion: varchar('app_version', { length: 30 }),
    // Station & Peripherals Association
    assignedDrawerId: integer('assigned_drawer_id').references(() => cashDrawers.id, { onDelete: 'set null' }),
    assignedKitchenStationId: integer('assigned_kitchen_station_id').references(() => kitchenStations.id, { onDelete: 'set null' }),
    assignedReceiptPrinterId: integer('assigned_receipt_printer_id').references(() => networkPrinters.id, { onDelete: 'set null' }),
    // Security & Lifecycle
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // PENDING_APPROVAL | ACTIVE | SUSPENDED | DECOMMISSIONED
    isLocked: boolean('is_locked').default(false).notNull(),
    allowOfflineSales: boolean('allow_offline_sales').default(true).notNull(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    lastHeartbeatIp: varchar('last_heartbeat_ip', { length: 64 }),
    registeredByUserId: integer('registered_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    decommissionedAt: timestamp('decommissioned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('pos_devices_tenant_idx').on(t.tenantId),
    index('pos_devices_branch_idx').on(t.branchId),
    index('pos_devices_code_idx').on(t.tenantId, t.deviceCode),
    index('pos_devices_status_idx').on(t.tenantId, t.status),
  ]
);

export const deviceEnrollmentTokens = pgTable(
  'device_enrollment_tokens',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    pairingCode: varchar('pairing_code', { length: 12 }).notNull(), // 6-digit or formatted pairing pin e.g. "749-218"
    token: text('token').notNull(), // Cryptographic one-time enrollment token
    deviceType: varchar('device_type', { length: 50 }).default('POS_TERMINAL').notNull(),
    assignedDrawerId: integer('assigned_drawer_id').references(() => cashDrawers.id, { onDelete: 'set null' }),
    assignedKitchenStationId: integer('assigned_kitchen_station_id').references(() => kitchenStations.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isClaimed: boolean('is_claimed').default(false).notNull(),
    claimedDeviceId: integer('claimed_device_id').references(() => posDevices.id, { onDelete: 'set null' }),
    createdByUserId: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('device_enrollment_tenant_idx').on(t.tenantId),
    index('device_enrollment_pairing_idx').on(t.tenantId, t.pairingCode),
  ]
);

// ============================================================================
// ENTERPRISE SUBSCRIPTIONS, SEAT LICENSING & BILLING LEDGER (FIN / BILLING)
// ============================================================================

export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).unique().notNull(), // e.g. "STARTER", "PROFESSIONAL", "ENTERPRISE"
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    billingCycle: varchar('billing_cycle', { length: 20 }).default('MONTHLY').notNull(), // MONTHLY | ANNUALLY
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('KES').notNull(),
    includedUsers: integer('included_users').default(5).notNull(),
    includedBranches: integer('included_branches').default(1).notNull(),
    perUserPrice: numeric('per_user_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    perBranchPrice: numeric('per_branch_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    features: jsonb('features').$type<string[]>().default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('subscription_plans_code_idx').on(t.code),
    index('subscription_plans_active_idx').on(t.isActive),
  ]
);

export const billingPaymentMethods = pgTable(
  'billing_payment_methods',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    type: varchar('type', { length: 30 }).notNull(), // CARD | MPESA_STANDING_ORDER | DIRECT_DEBIT | CORPORATE_INVOICE
    provider: varchar('provider', { length: 50 }).notNull(), // STRIPE | MPESA | DPO | PESAPAL | BANK_DIRECT
    accountMask: varchar('account_mask', { length: 50 }).notNull(), // e.g. "•••• 4242" or "2547••••123"
    brandOrBank: varchar('brand_or_bank', { length: 50 }), // VISA, MASTERCARD, SAFARICOM, KCB, EQUITY
    expiryMonth: integer('expiry_month'),
    expiryYear: integer('expiry_year'),
    token: text('token').notNull(), // Tokenized payment mandate / token reference
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('billing_payment_methods_tenant_idx').on(t.tenantId),
    index('billing_payment_methods_default_idx').on(t.tenantId, t.isDefault),
  ]
);

export const tenantSubscriptions = pgTable(
  'tenant_subscriptions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    planId: integer('plan_id')
      .references(() => subscriptionPlans.id, { onDelete: 'restrict' })
      .notNull(),
    status: varchar('status', { length: 30 }).default('TRIAL').notNull(), // TRIAL | ACTIVE | PAST_DUE | CANCELLED | SUSPENDED
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).defaultNow().notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    seatAllocation: integer('seat_allocation').default(5).notNull(),
    branchAllocation: integer('branch_allocation').default(1).notNull(),
    paymentMethodId: integer('payment_method_id')
      .references(() => billingPaymentMethods.id, { onDelete: 'set null' }),
    autoRenew: boolean('auto_renew').default(true).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('tenant_subscriptions_tenant_idx').on(t.tenantId),
    index('tenant_subscriptions_status_idx').on(t.status),
  ]
);

export const billingInvoices = pgTable(
  'billing_invoices',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    subscriptionId: integer('subscription_id')
      .references(() => tenantSubscriptions.id, { onDelete: 'set null' }),
    invoiceNumber: varchar('invoice_number', { length: 100 }).unique().notNull(), // e.g. "INV-2026-00128"
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(), // KRA VAT 16%
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('KES').notNull(),
    status: varchar('status', { length: 30 }).default('PENDING').notNull(), // DRAFT | PENDING | PAID | OVERDUE | VOID
    billingPeriodStart: timestamp('billing_period_start', { withTimezone: true }).notNull(),
    billingPeriodEnd: timestamp('billing_period_end', { withTimezone: true }).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paymentMethodType: varchar('payment_method_type', { length: 50 }),
    externalTransactionRef: varchar('external_transaction_ref', { length: 150 }),
    pdfUrl: text('pdf_url'),
    lineItems: jsonb('line_items')
      .$type<
        {
          description: string;
          quantity: number;
          unitPrice: number;
          amount: number;
        }[]
      >()
      .default([])
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('billing_invoices_tenant_idx').on(t.tenantId),
    index('billing_invoices_number_idx').on(t.invoiceNumber),
    index('billing_invoices_status_idx').on(t.tenantId, t.status),
  ]
);

// ============================================================================
// ENTERPRISE SECURITY, IDENTITY GOVERNANCE & ACTIVE SESSIONS (SEC / AUTH)
// ============================================================================

export const securitySettings = pgTable(
  'security_settings',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    // Password Policies
    minPasswordLength: integer('min_password_length').default(10).notNull(),
    requireUppercase: boolean('require_uppercase').default(true).notNull(),
    requireLowercase: boolean('require_lowercase').default(true).notNull(),
    requireNumbers: boolean('require_numbers').default(true).notNull(),
    requireSymbols: boolean('require_symbols').default(true).notNull(),
    passwordExpirationDays: integer('password_expiration_days').default(90).notNull(), // 0 = never
    preventPasswordReuseCount: integer('prevent_password_reuse_count').default(5).notNull(),
    // Multi-Factor Authentication (MFA)
    mfaEnforcement: varchar('mfa_enforcement', { length: 40 }).default('OPTIONAL').notNull(), // OPTIONAL | ENFORCED_FOR_ADMINS | ENFORCED_FOR_ALL
    allowedMfaMethods: jsonb('allowed_mfa_methods')
      .$type<string[]>()
      .default(['TOTP', 'EMAIL'])
      .notNull(),
    // Session Inactivity & Concurrency Controls
    sessionTimeoutMinutes: integer('session_timeout_minutes').default(30).notNull(), // Inactivity auto-lockout
    maxConcurrentSessions: integer('max_concurrent_sessions').default(3).notNull(), // 0 = unlimited
    enforceIpBinding: boolean('enforce_ip_binding').default(false).notNull(),
    notifyOnNewLogin: boolean('notify_on_new_login').default(true).notNull(),
    // Brute-Force & Lockout Controls
    maxFailedAttempts: integer('max_failed_attempts').default(5).notNull(),
    lockoutDurationMinutes: integer('lockout_duration_minutes').default(30).notNull(),
    // Network Perimeter & IP Access Restricting
    enableIpAllowlist: boolean('enable_ip_allowlist').default(false).notNull(),
    allowedIpRanges: jsonb('allowed_ip_ranges')
      .$type<string[]>()
      .default([])
      .notNull(), // e.g. ["192.168.1.0/24", "41.89.20.15"]
    // Single Sign-On (SSO) Status
    ssoEnabled: boolean('sso_enabled').default(false).notNull(),
    ssoProvider: varchar('sso_provider', { length: 50 }), // GOOGLE_WORKSPACE | MICROSOFT_AZURE | OKTA_SAML
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('security_settings_tenant_idx').on(t.tenantId),
  ]
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionTokenHash: varchar('session_token_hash', { length: 255 }).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }).notNull(),
    userAgent: text('user_agent'),
    deviceType: varchar('device_type', { length: 50 }).default('DESKTOP').notNull(), // DESKTOP | MOBILE | TABLET | POS_TERMINAL
    browser: varchar('browser', { length: 50 }),
    os: varchar('os', { length: 50 }),
    city: varchar('city', { length: 100 }),
    country: varchar('country', { length: 100 }),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('user_sessions_tenant_idx').on(t.tenantId),
    index('user_sessions_user_idx').on(t.userId),
    index('user_sessions_active_idx').on(t.tenantId, t.isRevoked),
  ]
);

// ============================================================================
// ENTERPRISE HELP DESK, SUPPORT TICKETING & KNOWLEDGE BASE (OPS / SUPPORT)
// ============================================================================

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    ticketNumber: varchar('ticket_number', { length: 50 }).unique().notNull(), // e.g. "TCK-2026-0042"
    subject: varchar('subject', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // HARDWARE | BILLING | POS_KDS | INVENTORY | AUTH_SECURITY | GENERAL
    priority: varchar('priority', { length: 20 }).default('MEDIUM').notNull(), // LOW | MEDIUM | HIGH | CRITICAL
    status: varchar('status', { length: 30 }).default('OPEN').notNull(), // OPEN | IN_PROGRESS | WAITING_FOR_USER | RESOLVED | CLOSED
    description: text('description').notNull(),
    diagnosticsPayload: jsonb('diagnostics_payload').$type<{
      clientVersion?: string;
      browser?: string;
      os?: string;
      screenResolution?: string;
      activeBranchId?: number | null;
      networkStatus?: string;
      deviceCode?: string;
    }>(),
    assignedAgent: varchar('assigned_agent', { length: 100 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('support_tickets_tenant_idx').on(t.tenantId),
    index('support_tickets_status_idx').on(t.tenantId, t.status),
    index('support_tickets_priority_idx').on(t.tenantId, t.priority),
  ]
);

export const supportTicketMessages = pgTable(
  'support_ticket_messages',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    ticketId: integer('ticket_id')
      .references(() => supportTickets.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    isStaffReply: boolean('is_staff_reply').default(false).notNull(), // true if enterprise support specialist
    senderName: varchar('sender_name', { length: 120 }).notNull(),
    message: text('message').notNull(),
    attachments: jsonb('attachments').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('support_ticket_messages_ticket_idx').on(t.ticketId),
  ]
);

export const knowledgeBaseArticles = pgTable(
  'knowledge_base_articles',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' }), // Nullable for global documentation
    slug: varchar('slug', { length: 150 }).unique().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // GETTING_STARTED | POS_TERMINALS | KITCHEN_ROUTING | FISCAL_ETIMS | BILLING
    summary: text('summary').notNull(),
    content: text('content').notNull(),
    readTimeMinutes: integer('read_time_minutes').default(3).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    viewCount: integer('view_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('kb_articles_category_idx').on(t.category),
    index('kb_articles_published_idx').on(t.isPublished),
  ]
);

// ============================================================================
// ENTERPRISE REPORTING, SUITEANALYTICS & SCHEDULED JOBS (ANALYTICS / AUDIT)
// ============================================================================

export const reportDefinitions = pgTable(
  'report_definitions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' }), // Nullable for system-wide standard reports
    code: varchar('code', { length: 80 }).unique().notNull(), // e.g. "HCM_HEADCOUNT_ATTENDANCE", "FIN_REVENUE_TAX_SUMMARY"
    name: varchar('name', { length: 150 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // WORKFORCE_HCM | REVENUE_SALES | OPERATIONS_KDS | COMPLIANCE_AUDIT
    description: text('description').notNull(),
    supportedFormats: jsonb('supported_formats')
      .$type<('CSV' | 'JSON' | 'PDF' | 'XLSX')[]>()
      .default(['CSV', 'JSON'])
      .notNull(),
    parameterSchema: jsonb('parameter_schema')
      .$type<{
        requiresDateRange?: boolean;
        requiresBranch?: boolean;
        customFilters?: { key: string; label: string; type: 'select' | 'text' | 'boolean'; options?: string[] }[];
      }>()
      .default({ requiresDateRange: true, requiresBranch: false })
      .notNull(),
    isSystem: boolean('is_system').default(true).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('report_definitions_category_idx').on(t.category),
    index('report_definitions_active_idx').on(t.isActive),
  ]
);

export const reportExecutions = pgTable(
  'report_executions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    reportDefinitionId: integer('report_definition_id')
      .references(() => reportDefinitions.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    requestedByUserId: integer('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    executionNumber: varchar('execution_number', { length: 100 }).unique().notNull(), // e.g. "REP-2026-00492"
    status: varchar('status', { length: 30 }).default('QUEUED').notNull(), // QUEUED | PROCESSING | COMPLETED | FAILED
    format: varchar('format', { length: 20 }).default('CSV').notNull(), // CSV | JSON | PDF | XLSX
    parametersApplied: jsonb('parameters_applied')
      .$type<Record<string, any>>()
      .default({})
      .notNull(),
    rowCount: integer('row_count').default(0).notNull(),
    executionDurationMs: integer('execution_duration_ms').default(0).notNull(),
    fileUrl: text('file_url'),
    errorMessage: text('error_message'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('report_executions_tenant_idx').on(t.tenantId),
    index('report_executions_def_idx').on(t.reportDefinitionId),
    index('report_executions_status_idx').on(t.tenantId, t.status),
  ]
);

export const reportSchedules = pgTable(
  'report_schedules',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    reportDefinitionId: integer('report_definition_id')
      .references(() => reportDefinitions.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    createdByUserId: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    frequency: varchar('frequency', { length: 30 }).default('WEEKLY').notNull(), // DAILY | WEEKLY | MONTHLY | END_OF_SHIFT
    deliveryChannel: varchar('delivery_channel', { length: 30 }).default('EMAIL').notNull(), // EMAIL | WEBHOOK | STORAGE
    recipients: jsonb('recipients')
      .$type<string[]>()
      .default([])
      .notNull(), // Email addresses or webhook URLs
    format: varchar('format', { length: 20 }).default('CSV').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('report_schedules_tenant_idx').on(t.tenantId),
    index('report_schedules_active_idx').on(t.isActive),
  ]
);

// ============================================================================
// CUSTOMERS & CRM DIRECTORY (CRM / SALES)
// ============================================================================

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }).notNull(),
    kraPin: varchar('kra_pin', { length: 50 }), // For B2B corporate tax invoices
    companyName: varchar('company_name', { length: 255 }),
    customerType: varchar('customer_type', { length: 50 }).default('RETAIL').notNull(), // RETAIL | CORPORATE | VIP | WHOLESALE
    loyaltyPoints: integer('loyalty_points').default(0).notNull(),
    totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0.00').notNull(),
    ordersCount: integer('orders_count').default(0).notNull(),
    address: text('address'),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('customers_tenant_idx').on(t.tenantId),
    index('customers_phone_idx').on(t.tenantId, t.phone),
    index('customers_email_idx').on(t.tenantId, t.email),
    index('customers_type_idx').on(t.tenantId, t.customerType),
  ]
);

export const customerInteractions = pgTable(
  'customer_interactions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    interactionType: varchar('interaction_type', { length: 50 }).default('NOTE').notNull(), // NOTE | CALL | EMAIL | FEEDBACK | SUPPORT_TICKET
    subject: varchar('subject', { length: 255 }).notNull(),
    details: text('details').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('customer_interactions_customer_idx').on(t.customerId),
    index('customer_interactions_tenant_idx').on(t.tenantId),
  ]
);

// ============================================================================
// LOYALTY, REWARDS & MEMBER INCENTIVES (CRM / HCM ENGAGEMENT)
// ============================================================================

export const loyaltyTiers = pgTable(
  'loyalty_tiers',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(), // e.g., "Silver Member", "Gold VIP", "Platinum Elite"
    minPoints: integer('min_points').default(0).notNull(),
    earningMultiplier: numeric('earning_multiplier', { precision: 4, scale: 2 }).default('1.00').notNull(), // e.g. 1.5x points per KES spent
    perks: jsonb('perks').$type<string[]>().default([]).notNull(), // e.g. ["Free Priority Seating", "Complimentary Dessert", "10% Discount"]
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('loyalty_tiers_tenant_idx').on(t.tenantId),
  ]
);

export const customerLoyaltyProfiles = pgTable(
  'customer_loyalty_profiles',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    tierId: integer('tier_id')
      .references(() => loyaltyTiers.id, { onDelete: 'set null' }),
    currentPoints: integer('current_points').default(0).notNull(),
    lifetimePointsEarned: integer('lifetime_points_earned').default(0).notNull(),
    lifetimePointsRedeemed: integer('lifetime_points_redeemed').default(0).notNull(),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('cust_loyalty_tenant_idx').on(t.tenantId),
    index('cust_loyalty_customer_idx').on(t.customerId),
  ]
);

export const loyaltyPointTransactions = pgTable(
  'loyalty_point_transactions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    transactionType: varchar('transaction_type', { length: 40 }).notNull(), // 'EARN_PURCHASE', 'REDEEM_REWARD', 'MANUAL_ADJUSTMENT', 'TIER_BONUS'
    points: integer('points').notNull(), // Positive = Earn, Negative = Redeem
    balanceAfter: integer('balance_after').notNull(),
    description: text('description').notNull(),
    processedById: integer('processed_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('loyalty_tx_tenant_idx').on(t.tenantId),
    index('loyalty_tx_customer_idx').on(t.customerId),
    index('loyalty_tx_created_idx').on(t.tenantId, t.createdAt),
  ]
);

export const loyaltyRewardsCatalog = pgTable(
  'loyalty_rewards_catalog',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 150 }).notNull(), // e.g. "Free Artisan Coffee", "KES 500 Discount Voucher"
    description: text('description'),
    pointsCost: integer('points_cost').notNull(),
    rewardType: varchar('reward_type', { length: 50 }).default('DISCOUNT_FIXED').notNull(), // 'DISCOUNT_FIXED', 'PERCENTAGE_OFF', 'FREE_MENU_ITEM'
    rewardValue: decimal('reward_value', { precision: 12, scale: 2 }).default('0.00').notNull(), // monetary value or %
    menuItemId: integer('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('loyalty_rewards_tenant_idx').on(t.tenantId),
    index('loyalty_rewards_active_idx').on(t.tenantId, t.isActive),
  ]
);

// ============================================================================
// LOYALTY LEDGER & TRANSACTION AUDIT (CRM / AUDIT)
// ============================================================================

export const loyaltyTransactionsLedger = pgTable(
  'loyalty_transactions_ledger',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    customerId: integer('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    rewardId: integer('reward_id').references(() => loyaltyRewardsCatalog.id, { onDelete: 'set null' }),
    
    // Transaction Classification & Financial Value
    entryType: varchar('entry_type', { length: 50 }).notNull(), // 'ACCRUAL_PURCHASE', 'REDEMPTION_VOUCHER', 'MANUAL_ADJUSTMENT', 'EXPIRY_DEDUCTION', 'TIER_BONUS'
    pointsDelta: integer('points_delta').notNull(), // Positive for earnings, Negative for burn/redemptions
    monetaryValueKes: decimal('monetary_value_kes', { precision: 12, scale: 2 }).default('0.00').notNull(), // Equivalent spend or discount value
    balanceBefore: integer('balance_before').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    
    channel: varchar('channel', { length: 30 }).default('POS_TERMINAL').notNull(), // 'POS_TERMINAL', 'WEB_PORTAL', 'MOBILE_APP', 'ADMIN_BACKOFFICE'
    auditReference: varchar('audit_reference', { length: 100 }), // e.g. "TRX-LOY-2026-0091"
    notes: text('notes'),
    processedById: integer('processed_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('loyalty_ledger_tenant_idx').on(t.tenantId),
    index('loyalty_ledger_customer_idx').on(t.customerId),
    index('loyalty_ledger_type_idx').on(t.tenantId, t.entryType),
    index('loyalty_ledger_created_idx').on(t.tenantId, t.createdAt),
  ]
);