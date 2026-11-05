import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Define explicit role enum
export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'OWNER',
  'MANAGER',
  'CASHIER',
  'WAITER',
  'CHEF',
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
    tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    defaultBranchId: integer('default_branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 50 }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    pinHash: varchar('pin_hash', { length: 255 }),
    role: userRoleEnum('role').notNull(), // Strictly typed, no silent defaults
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('users_tenant_idx').on(t.tenantId),
    index('users_tenant_branch_idx').on(t.tenantId, t.defaultBranchId),
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

export const logisticsFleet = pgTable(
  'logistics_fleet',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    vehiclePlate: varchar('vehicle_plate', { length: 50 }).notNull(), // e.g. "KBZ 412X"
    vehicleType: varchar('vehicle_type', { length: 50 }).default('REEFER_VAN').notNull(), // 'REEFER_VAN', 'BOX_TRUCK', 'PICKUP', 'MOTORBIKE'
    driverName: varchar('driver_name', { length: 100 }),
    driverPhone: varchar('driver_phone', { length: 30 }),
    isRefrigerated: boolean('is_refrigerated').default(false).notNull(),
    minTargetTemp: decimal('min_target_temp', { precision: 5, scale: 2 }), // e.g. 2.00
    maxTargetTemp: decimal('max_target_temp', { precision: 5, scale: 2 }), // e.g. 8.00
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('fleet_tenant_idx').on(t.tenantId),
    index('fleet_plate_idx').on(t.vehiclePlate),
  ]
);

export const deliveryAssignments = pgTable(
  'delivery_assignments',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: integer('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 100 }).default('In-House').notNull(), // In-House, Uber Direct, Bolt, Glovo, Little Cab
    driverName: varchar('driver_name', { length: 255 }).notNull(),
    driverPhone: varchar('driver_phone', { length: 50 }),
    deliveryAddress: text('delivery_address'),
    trackingUrl: varchar('tracking_url', { length: 500 }),
    deliveryFee: decimal('delivery_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 50 }).default('Assigned').notNull(), // Assigned, Dispatched, Delivered, Failed
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
