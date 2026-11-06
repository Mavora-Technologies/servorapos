"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsRelations = exports.fiscalInvoices = exports.mpesaC2bCallbacks = exports.drawerSessions = exports.cashDrawers = exports.refunds = exports.mpesaTransactions = exports.bankStatementLines = exports.bankStatements = exports.payments = exports.cashierShifts = exports.deliveryAssignments = exports.logisticsFleet = exports.stockTransferItems = exports.stockTransfers = exports.stockCountItems = exports.stockCounts = exports.stockMovements = exports.orderItems = exports.orders = exports.waitlistEntries = exports.reservations = exports.restaurantTables = exports.diningAreas = exports.wasteLogs = exports.warehouseLocations = exports.inventoryBatches = exports.unitConversions = exports.inventoryItems = exports.supplierReturnItems = exports.supplierReturns = exports.supplierInvoiceItems = exports.supplierInvoices = exports.goodsReceivedItems = exports.goodsReceivedNotes = exports.purchaseOrderItems = exports.purchaseOrders = exports.purchaseRequestItems = exports.purchaseRequests = exports.suppliers = exports.menuModifiers = exports.menuItems = exports.menuCategories = exports.auditLogs = exports.userBranchMemberships = exports.roles = exports.users = exports.branches = exports.tenants = exports.userRoleEnum = void 0;
exports.transferFleetDispatches = exports.logisticsVehicles = exports.notifications = exports.recipeIngredients = exports.recipes = exports.menuItemAvailability = exports.itemPricingRules = exports.comboBundleItems = exports.comboBundles = exports.modifierOptions = exports.modifierGroups = exports.orderItemsRelations = exports.ordersRelations = exports.menuItemsRelations = exports.menuCategoriesRelations = exports.branchesRelations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// 1. Define explicit role enum
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', [
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
exports.tenants = (0, pg_core_1.pgTable)('tenants', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    businessName: (0, pg_core_1.varchar)('business_name', { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 100 }),
    legalName: (0, pg_core_1.varchar)('legal_name', { length: 255 }),
    kraPin: (0, pg_core_1.varchar)('kra_pin', { length: 50 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('KES').notNull(),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 64 }).default('Africa/Nairobi').notNull(),
    subscriptionPlan: (0, pg_core_1.varchar)('subscription_plan', { length: 50 }).default('STARTER').notNull(),
    subscriptionStatus: (0, pg_core_1.varchar)('subscription_status', { length: 50 }).default('ACTIVE').notNull(),
    logoUrl: (0, pg_core_1.text)('logo_url'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('tenants_slug_idx').on(t.slug),
    (0, pg_core_1.index)('tenants_active_idx').on(t.isActive),
]);
exports.branches = (0, pg_core_1.pgTable)('branches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(), // e.g., NBO-WESTLANDS
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    address: (0, pg_core_1.text)('address'),
    kraPin: (0, pg_core_1.varchar)('kra_pin', { length: 50 }),
    etimsBranchId: (0, pg_core_1.varchar)('etims_branch_id', { length: 20 }).default('00'), // KRA bhfId
    etimsDeviceSerial: (0, pg_core_1.varchar)('etims_device_serial', { length: 100 }), // KRA sdcId / mrcNo
    receiptFooter: (0, pg_core_1.text)('receipt_footer'),
    isMainBranch: (0, pg_core_1.boolean)('is_main_branch').default(false).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('branches_tenant_code_idx').on(t.tenantId, t.code),
    (0, pg_core_1.index)('branches_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// 2. USERS, RBAC (ROLES & PERMISSIONS) & AUDIT LOGS
// ============================================================================
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').references(() => exports.tenants.id, { onDelete: 'cascade' }),
    defaultBranchId: (0, pg_core_1.integer)('default_branch_id').references(() => exports.branches.id, {
        onDelete: 'set null',
    }),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).unique().notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    pinHash: (0, pg_core_1.varchar)('pin_hash', { length: 255 }),
    role: (0, exports.userRoleEnum)('role').notNull(), // Strictly typed, no silent defaults
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('users_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('users_tenant_branch_idx').on(t.tenantId, t.defaultBranchId),
]);
exports.roles = (0, pg_core_1.pgTable)('roles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').references(() => exports.tenants.id, { onDelete: 'cascade' }), // Nullable for system-wide default roles
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 100 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    permissions: (0, pg_core_1.jsonb)('permissions').$type().default([]).notNull(), // e.g. ["pos.checkout", "pos.void", "inventory.adjust"]
    isSystemRole: (0, pg_core_1.boolean)('is_system_role').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('roles_tenant_slug_idx').on(t.tenantId, t.slug),
]);
exports.userBranchMemberships = (0, pg_core_1.pgTable)('user_branch_memberships', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    roleId: (0, pg_core_1.integer)('role_id').references(() => exports.roles.id, { onDelete: 'set null' }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('user_branch_unique_idx').on(t.userId, t.branchId),
    (0, pg_core_1.index)('user_branch_tenant_idx').on(t.tenantId),
]);
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(), // e.g. ORDER_VOIDED, STOCK_ADJUSTED, MPESA_CLAIMED
    module: (0, pg_core_1.varchar)('module', { length: 50 }).notNull(), // POS, INVENTORY, FINANCE, AUTH
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 100 }).notNull(),
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 100 }).notNull(),
    reason: (0, pg_core_1.text)('reason'),
    previousValues: (0, pg_core_1.jsonb)('previous_values'),
    newValues: (0, pg_core_1.jsonb)('new_values'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 64 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('audit_logs_tenant_created_idx').on(t.tenantId, t.createdAt),
    (0, pg_core_1.index)('audit_logs_entity_idx').on(t.tenantId, t.entityType, t.entityId),
]);
// ============================================================================
// 3. MENU CATEGORIES, ITEMS & MODIFIERS
// ============================================================================
exports.menuCategories = (0, pg_core_1.pgTable)('menu_categories', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable = shared across all tenant branches
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    sortOrder: (0, pg_core_1.integer)('sort_order').default(0).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('menu_categories_tenant_idx').on(t.tenantId),
]);
exports.menuItems = (0, pg_core_1.pgTable)('menu_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable = available at all branches
    categoryId: (0, pg_core_1.integer)('category_id')
        .references(() => exports.menuCategories.id, { onDelete: 'restrict' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    sku: (0, pg_core_1.varchar)('sku', { length: 100 }),
    description: (0, pg_core_1.text)('description'),
    price: (0, pg_core_1.decimal)('price', { precision: 12, scale: 2 }).notNull(),
    costEstimate: (0, pg_core_1.decimal)('cost_estimate', { precision: 12, scale: 2 }).default('0.00').notNull(),
    // Stock tracking policy per Section 16: RECIPE, STOCKED_PRODUCT, COMPOSITE, NON_TRACKED
    stockTrackingType: (0, pg_core_1.varchar)('stock_tracking_type', { length: 50 }).default('RECIPE').notNull(),
    directInventoryItemId: (0, pg_core_1.integer)('direct_inventory_item_id'), // Used when stockTrackingType = STOCKED_PRODUCT
    kitchenStation: (0, pg_core_1.varchar)('kitchen_station', { length: 50 }).default('MAIN_KITCHEN').notNull(), // MAIN_KITCHEN, GRILL, BAR, PASTRY
    prepTimeMinutes: (0, pg_core_1.integer)('prep_time_minutes').default(15).notNull(),
    // Tax & KRA eTIMS classification
    taxRate: (0, pg_core_1.decimal)('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(),
    cateringLevyRate: (0, pg_core_1.decimal)('catering_levy_rate', { precision: 5, scale: 2 }).default('2.00').notNull(),
    isTaxInclusive: (0, pg_core_1.boolean)('is_tax_inclusive').default(true).notNull(),
    etimsItemCode: (0, pg_core_1.varchar)('etims_item_code', { length: 50 }),
    etimsClassCode: (0, pg_core_1.varchar)('etims_class_code', { length: 50 }),
    etimsTaxTypeCode: (0, pg_core_1.varchar)('etims_tax_type_code', { length: 10 }).default('B'), // B = 16% VAT
    isAvailable: (0, pg_core_1.boolean)('is_available').default(true).notNull(),
    imageUrl: (0, pg_core_1.text)('image_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('menu_items_tenant_sku_idx').on(t.tenantId, t.sku),
    (0, pg_core_1.index)('menu_items_tenant_category_idx').on(t.tenantId, t.categoryId),
    (0, pg_core_1.index)('menu_items_tenant_available_idx').on(t.tenantId, t.isAvailable),
]);
exports.menuModifiers = (0, pg_core_1.pgTable)('menu_modifiers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    menuItemId: (0, pg_core_1.integer)('menu_item_id')
        .references(() => exports.menuItems.id, { onDelete: 'cascade' })
        .notNull(),
    groupName: (0, pg_core_1.varchar)('group_name', { length: 100 }).notNull(), // e.g., "Size", "Milk Option", "Extras"
    optionName: (0, pg_core_1.varchar)('option_name', { length: 100 }).notNull(), // e.g., "Large", "Oat Milk", "Extra Cheese"
    priceDelta: (0, pg_core_1.decimal)('price_delta', { precision: 12, scale: 2 }).default('0.00').notNull(),
    linkedInventoryItemId: (0, pg_core_1.integer)('linked_inventory_item_id'), // Optional ingredient deduction for modifier
    linkedQuantity: (0, pg_core_1.decimal)('linked_quantity', { precision: 12, scale: 4 }).default('0.0000'),
    isRequired: (0, pg_core_1.boolean)('is_required').default(false).notNull(),
    isAvailable: (0, pg_core_1.boolean)('is_available').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('menu_modifiers_item_idx').on(t.tenantId, t.menuItemId),
]);
// ============================================================================
// 4. INVENTORY, RECIPES (BOM) & TRACEABLE STOCK MOVEMENTS
// ============================================================================
exports.suppliers = (0, pg_core_1.pgTable)('suppliers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    contactPerson: (0, pg_core_1.varchar)('contact_person', { length: 150 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    kraPin: (0, pg_core_1.varchar)('kra_pin', { length: 50 }), // Tax compliance for KRA ETR / eTIMS
    physicalAddress: (0, pg_core_1.text)('physical_address'),
    city: (0, pg_core_1.varchar)('city', { length: 100 }).default('Nairobi'),
    paymentTerms: (0, pg_core_1.varchar)('payment_terms', { length: 50 }).default('NET_30'), // 'COD', 'NET_7', 'NET_14', 'NET_30', 'PREPAID'
    leadTimeDays: (0, pg_core_1.integer)('lead_time_days').default(2).notNull(),
    bankName: (0, pg_core_1.varchar)('bank_name', { length: 100 }),
    bankAccountNumber: (0, pg_core_1.varchar)('bank_account_number', { length: 100 }),
    mpesaPaybillNumber: (0, pg_core_1.varchar)('mpesa_paybill_number', { length: 50 }),
    notes: (0, pg_core_1.text)('notes'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('suppliers_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('suppliers_active_idx').on(t.tenantId, t.isActive),
]);
exports.purchaseRequests = (0, pg_core_1.pgTable)('purchase_requests', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    requestNumber: (0, pg_core_1.varchar)('request_number', { length: 50 }).notNull(), // e.g. "PR-2026-001"
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('PENDING').notNull(), // 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO'
    priority: (0, pg_core_1.varchar)('priority', { length: 20 }).default('NORMAL').notNull(), // 'LOW', 'NORMAL', 'URGENT'
    requestedById: (0, pg_core_1.integer)('requested_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    reviewedById: (0, pg_core_1.integer)('reviewed_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    department: (0, pg_core_1.varchar)('department', { length: 80 }).default('KITCHEN').notNull(), // 'KITCHEN', 'BAR', 'PASTRY', 'FLOOR'
    estimatedTotal: (0, pg_core_1.decimal)('estimated_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    notes: (0, pg_core_1.text)('notes'),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('pr_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('pr_status_idx').on(t.status),
    (0, pg_core_1.index)('pr_priority_idx').on(t.priority),
]);
exports.purchaseRequestItems = (0, pg_core_1.pgTable)('purchase_request_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    purchaseRequestId: (0, pg_core_1.integer)('purchase_request_id')
        .notNull()
        .references(() => exports.purchaseRequests.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    requestedQuantity: (0, pg_core_1.decimal)('requested_quantity', { precision: 12, scale: 4 }).notNull(),
    estimatedUnitCost: (0, pg_core_1.decimal)('estimated_unit_cost', { precision: 12, scale: 4 }).notNull(),
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).notNull(),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('pr_items_request_idx').on(t.purchaseRequestId),
    (0, pg_core_1.index)('pr_items_item_idx').on(t.inventoryItemId),
]);
exports.purchaseOrders = (0, pg_core_1.pgTable)('purchase_orders', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    supplierId: (0, pg_core_1.integer)('supplier_id')
        .notNull()
        .references(() => exports.suppliers.id, { onDelete: 'restrict' }),
    poNumber: (0, pg_core_1.varchar)('po_number', { length: 50 }).notNull(), // e.g., "PO-2026-001"
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('DRAFT').notNull(), // 'DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'
    paymentTerms: (0, pg_core_1.varchar)('payment_terms', { length: 50 }).default('NET_30').notNull(),
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    taxAmount: (0, pg_core_1.decimal)('tax_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    totalAmount: (0, pg_core_1.decimal)('total_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    deliveryExpectedDate: (0, pg_core_1.timestamp)('delivery_expected_date', { withTimezone: true }),
    issuedAt: (0, pg_core_1.timestamp)('issued_at', { withTimezone: true }),
    createdById: (0, pg_core_1.integer)('created_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('po_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('po_status_idx').on(t.status),
    (0, pg_core_1.index)('po_supplier_idx').on(t.supplierId),
]);
exports.purchaseOrderItems = (0, pg_core_1.pgTable)('purchase_order_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id')
        .notNull()
        .references(() => exports.purchaseOrders.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    quantityOrdered: (0, pg_core_1.decimal)('quantity_ordered', { precision: 12, scale: 4 }).notNull(),
    quantityReceived: (0, pg_core_1.decimal)('quantity_received', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    taxRate: (0, pg_core_1.decimal)('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(), // standard VAT 16%
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).notNull(),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('po_items_order_idx').on(t.purchaseOrderId),
    (0, pg_core_1.index)('po_items_item_idx').on(t.inventoryItemId),
]);
exports.goodsReceivedNotes = (0, pg_core_1.pgTable)('goods_received_notes', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id')
        .notNull()
        .references(() => exports.purchaseOrders.id, { onDelete: 'restrict' }),
    supplierId: (0, pg_core_1.integer)('supplier_id')
        .notNull()
        .references(() => exports.suppliers.id, { onDelete: 'restrict' }),
    grnNumber: (0, pg_core_1.varchar)('grn_number', { length: 50 }).notNull(), // e.g. "GRN-2026-001"
    supplierDeliveryNote: (0, pg_core_1.varchar)('supplier_delivery_note', { length: 100 }), // Purveyor's physical delivery note/invoice #
    receivedById: (0, pg_core_1.integer)('received_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    receivedDate: (0, pg_core_1.timestamp)('received_date', { withTimezone: true }).defaultNow().notNull(),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('grn_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('grn_po_idx').on(t.purchaseOrderId),
    (0, pg_core_1.index)('grn_supplier_idx').on(t.supplierId),
]);
exports.goodsReceivedItems = (0, pg_core_1.pgTable)('goods_received_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    grnId: (0, pg_core_1.integer)('grn_id')
        .notNull()
        .references(() => exports.goodsReceivedNotes.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    quantityAccepted: (0, pg_core_1.decimal)('quantity_accepted', { precision: 12, scale: 4 }).notNull(),
    quantityRejected: (0, pg_core_1.decimal)('quantity_rejected', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('grn_items_grn_idx').on(t.grnId),
    (0, pg_core_1.index)('grn_items_item_idx').on(t.inventoryItemId),
]);
exports.supplierInvoices = (0, pg_core_1.pgTable)('supplier_invoices', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    supplierId: (0, pg_core_1.integer)('supplier_id')
        .notNull()
        .references(() => exports.suppliers.id, { onDelete: 'restrict' }),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id')
        .references(() => exports.purchaseOrders.id, { onDelete: 'set null' }),
    goodsReceivedNoteId: (0, pg_core_1.integer)('goods_received_note_id')
        .references(() => exports.goodsReceivedNotes.id, { onDelete: 'set null' }),
    invoiceNumber: (0, pg_core_1.varchar)('invoice_number', { length: 100 }).notNull(), // Purveyor's physical invoice #
    internalRef: (0, pg_core_1.varchar)('internal_ref', { length: 50 }).notNull(), // System internal ref (e.g. "PINV-2026-001")
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('UNPAID').notNull(), // 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'DISPUTED'
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).notNull(),
    taxAmount: (0, pg_core_1.decimal)('tax_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    totalAmount: (0, pg_core_1.decimal)('total_amount', { precision: 12, scale: 4 }).notNull(),
    paidAmount: (0, pg_core_1.decimal)('paid_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    invoiceDate: (0, pg_core_1.timestamp)('invoice_date', { withTimezone: true }).defaultNow().notNull(),
    dueDate: (0, pg_core_1.timestamp)('due_date', { withTimezone: true }).notNull(),
    createdById: (0, pg_core_1.integer)('created_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('supplier_inv_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('supplier_inv_status_idx').on(t.status),
    (0, pg_core_1.index)('supplier_inv_due_idx').on(t.dueDate),
    (0, pg_core_1.index)('supplier_inv_supplier_idx').on(t.supplierId),
]);
exports.supplierInvoiceItems = (0, pg_core_1.pgTable)('supplier_invoice_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    supplierInvoiceId: (0, pg_core_1.integer)('supplier_invoice_id')
        .notNull()
        .references(() => exports.supplierInvoices.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    quantity: (0, pg_core_1.decimal)('quantity', { precision: 12, scale: 4 }).notNull(),
    unitPrice: (0, pg_core_1.decimal)('unit_price', { precision: 12, scale: 4 }).notNull(),
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).notNull(),
    taxRate: (0, pg_core_1.decimal)('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('supplier_inv_items_inv_idx').on(t.supplierInvoiceId),
    (0, pg_core_1.index)('supplier_inv_items_item_idx').on(t.inventoryItemId),
]);
exports.supplierReturns = (0, pg_core_1.pgTable)('supplier_returns', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    supplierId: (0, pg_core_1.integer)('supplier_id')
        .notNull()
        .references(() => exports.suppliers.id, { onDelete: 'restrict' }),
    goodsReceivedNoteId: (0, pg_core_1.integer)('goods_received_note_id')
        .references(() => exports.goodsReceivedNotes.id, { onDelete: 'set null' }),
    supplierInvoiceId: (0, pg_core_1.integer)('supplier_invoice_id')
        .references(() => exports.supplierInvoices.id, { onDelete: 'set null' }),
    returnNumber: (0, pg_core_1.varchar)('return_number', { length: 50 }).notNull(), // e.g. "PRT-2026-001"
    debitNoteNumber: (0, pg_core_1.varchar)('debit_note_number', { length: 50 }), // Fiscal / Purveyor Debit Note #
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('PENDING_DISPATCH').notNull(), // 'PENDING_DISPATCH', 'DISPATCHED', 'CREDITED', 'REJECTED'
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).notNull(),
    taxAmount: (0, pg_core_1.decimal)('tax_amount', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    totalAmount: (0, pg_core_1.decimal)('total_amount', { precision: 12, scale: 4 }).notNull(),
    createdById: (0, pg_core_1.integer)('created_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    dispatchedAt: (0, pg_core_1.timestamp)('dispatched_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('supplier_returns_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('supplier_returns_status_idx').on(t.status),
    (0, pg_core_1.index)('supplier_returns_supplier_idx').on(t.supplierId),
]);
exports.supplierReturnItems = (0, pg_core_1.pgTable)('supplier_return_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    supplierReturnId: (0, pg_core_1.integer)('supplier_return_id')
        .notNull()
        .references(() => exports.supplierReturns.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    quantity: (0, pg_core_1.decimal)('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 4 }).notNull(),
    reason: (0, pg_core_1.varchar)('reason', { length: 80 }).notNull(), // 'DEFECTIVE_SPOILED', 'WRONG_ITEM', 'BROKEN_PACKAGING', 'TEMPERATURE_ABUSE', 'OVER_DELIVERY'
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('supplier_ret_items_ret_idx').on(t.supplierReturnId),
    (0, pg_core_1.index)('supplier_ret_items_inv_idx').on(t.inventoryItemId),
]);
exports.inventoryItems = (0, pg_core_1.pgTable)('inventory_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    sku: (0, pg_core_1.varchar)('sku', { length: 100 }),
    barcode: (0, pg_core_1.varchar)('barcode', { length: 100 }), // GTIN-13 / EAN barcode
    materialType: (0, pg_core_1.varchar)('material_type', { length: 50 }).default('RAW_MATERIAL').notNull(),
    // 'RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'CONSUMABLE'
    category: (0, pg_core_1.varchar)('category', { length: 100 }).notNull(),
    unit: (0, pg_core_1.varchar)('unit', { length: 30 }).notNull(), // Base consumption unit (e.g. 'kg', 'litres', 'pcs')
    purchaseUnit: (0, pg_core_1.varchar)('purchase_unit', { length: 30 }).default('pcs'),
    conversionFactor: (0, pg_core_1.decimal)('conversion_factor', { precision: 12, scale: 4 }).default('1.0000').notNull(),
    preferredSupplierId: (0, pg_core_1.integer)('preferred_supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    costPrice: (0, pg_core_1.decimal)('cost_price', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    valuationMethod: (0, pg_core_1.varchar)('valuation_method', { length: 30 }).default('FIFO').notNull(), // 'FIFO', 'AVCO', 'STANDARD'
    minThreshold: (0, pg_core_1.decimal)('min_threshold', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    reorderQuantity: (0, pg_core_1.decimal)('reorder_quantity', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    currentStock: (0, pg_core_1.decimal)('current_stock', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    trackingMethod: (0, pg_core_1.varchar)('tracking_method', { length: 30 }).default('BATCH_EXPIRY').notNull(),
    // 'BATCH_EXPIRY', 'SERIALIZED', 'NONE'
    storageCondition: (0, pg_core_1.varchar)('storage_condition', { length: 50 }).default('DRY_AMBIENT').notNull(),
    // 'DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'WARM_HEATED'
    taxClassification: (0, pg_core_1.varchar)('tax_classification', { length: 20 }).default('A_16').notNull(), // 'A_16' (16%), 'B_ZERO' (0%), 'E_EXEMPT'
    allowNegativeStock: (0, pg_core_1.boolean)('allow_negative_stock').default(false).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('inv_items_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('inv_items_sku_idx').on(t.sku),
    (0, pg_core_1.index)('inv_items_cat_idx').on(t.category),
    (0, pg_core_1.index)('inv_items_mat_type_idx').on(t.materialType),
]);
exports.unitConversions = (0, pg_core_1.pgTable)('unit_conversions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    fromUnit: (0, pg_core_1.varchar)('from_unit', { length: 50 }).notNull(), // e.g. "Crate", "Sack 50kg", "tbsp", "cup"
    toUnit: (0, pg_core_1.varchar)('to_unit', { length: 50 }).notNull(), // Base ledger unit: "kg", "g", "litres", "ml", "pcs"
    conversionFactor: (0, pg_core_1.decimal)('conversion_factor', { precision: 12, scale: 4 }).notNull(), // Multiply fromUnit by this factor to get toUnit
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id').references(() => exports.inventoryItems.id, { onDelete: 'cascade' }), // Optional: if null, it is a global unit rule (e.g. 1 kg = 1000 g)
    unitCategory: (0, pg_core_1.varchar)('unit_category', { length: 50 }).notNull().default('WEIGHT'), // 'WEIGHT', 'VOLUME', 'PACKAGING', 'CUSTOM'
    description: (0, pg_core_1.text)('description'),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('unit_conv_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('unit_conv_item_idx').on(t.inventoryItemId),
]);
exports.inventoryBatches = (0, pg_core_1.pgTable)('inventory_batches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    supplierId: (0, pg_core_1.integer)('supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    batchNumber: (0, pg_core_1.varchar)('batch_number', { length: 50 }).notNull(), // System internal lot #
    supplierBatchNumber: (0, pg_core_1.varchar)('supplier_batch_number', { length: 100 }), // Vendor's printed batch code
    certificateNumber: (0, pg_core_1.varchar)('certificate_number', { length: 100 }), // Quality inspection cert / COA
    initialQuantity: (0, pg_core_1.decimal)('initial_quantity', { precision: 12, scale: 4 }).notNull(),
    currentQuantity: (0, pg_core_1.decimal)('current_quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    locationBin: (0, pg_core_1.varchar)('location_bin', { length: 80 }), // e.g. "Walk-in Dairy Chiller 2B"
    storageTemperature: (0, pg_core_1.decimal)('storage_temperature', { precision: 5, scale: 2 }), // Logged intake temp in °C
    receivedDate: (0, pg_core_1.timestamp)('received_date', { withTimezone: true }).defaultNow().notNull(),
    expiryDate: (0, pg_core_1.timestamp)('expiry_date', { withTimezone: true }).notNull(),
    // Enterprise QC Lifecycle
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('ACTIVE').notNull(),
    // 'ACTIVE', 'QUARANTINE', 'QUALITY_HOLD', 'EXPIRED', 'DISCARDED', 'DEPLETED'
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('inv_batch_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('inv_batch_item_idx').on(t.inventoryItemId),
    (0, pg_core_1.index)('inv_batch_status_idx').on(t.status),
    (0, pg_core_1.index)('inv_batch_expiry_idx').on(t.expiryDate),
]);
exports.warehouseLocations = (0, pg_core_1.pgTable)('warehouse_locations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id')
        .notNull()
        .references(() => exports.branches.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(), // e.g. "CHL-01-B2"
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g. "Walk-in Dairy Chiller (Shelf 2B)"
    zoneType: (0, pg_core_1.varchar)('zone_type', { length: 50 }).default('DRY_AMBIENT').notNull(),
    // 'DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'PREP_LINE', 'HOLDING_PASS'
    targetMinTemp: (0, pg_core_1.decimal)('target_min_temp', { precision: 5, scale: 2 }), // e.g. 2.00
    targetMaxTemp: (0, pg_core_1.decimal)('target_max_temp', { precision: 5, scale: 2 }), // e.g. 8.00
    isRefrigerated: (0, pg_core_1.boolean)('is_refrigerated').default(false).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('wh_loc_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('wh_loc_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('wh_loc_code_idx').on(t.code),
]);
exports.wasteLogs = (0, pg_core_1.pgTable)('waste_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    inventoryBatchId: (0, pg_core_1.integer)('inventory_batch_id')
        .references(() => exports.inventoryBatches.id, { onDelete: 'set null' }),
    // Enterprise Cost Center / Department
    department: (0, pg_core_1.varchar)('department', { length: 50 }).default('KITCHEN').notNull(),
    // 'KITCHEN', 'BAR', 'BAKERY', 'BUTCHERY', 'MAIN_STORE', 'FLOOR'
    wasteReason: (0, pg_core_1.varchar)('waste_reason', { length: 80 }).notNull(),
    // 'EXPIRED', 'SPOILED_STORAGE', 'OVERCOOKED_BURNED', 'DROPPED_DAMAGED', 'PREP_ERROR', 'OVER_PORTIONED', 'EQUIPMENT_FAILURE'
    dispositionMethod: (0, pg_core_1.varchar)('disposition_method', { length: 50 }).default('TRASH_LANDFILL').notNull(),
    // 'TRASH_LANDFILL', 'COMPOST_ORGANIC', 'STAFF_FEEDING', 'SUPPLIER_CLAIM'
    quantity: (0, pg_core_1.decimal)('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    totalLossCost: (0, pg_core_1.decimal)('total_loss_cost', { precision: 12, scale: 4 }).notNull(),
    locationBin: (0, pg_core_1.varchar)('location_bin', { length: 80 }),
    documentReference: (0, pg_core_1.varchar)('document_reference', { length: 50 }),
    reportedById: (0, pg_core_1.integer)('reported_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    witnessedById: (0, pg_core_1.integer)('witnessed_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    notes: (0, pg_core_1.text)('notes'),
    loggedAt: (0, pg_core_1.timestamp)('logged_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('waste_logs_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('waste_logs_item_idx').on(t.inventoryItemId),
    (0, pg_core_1.index)('waste_logs_reason_idx').on(t.wasteReason),
    (0, pg_core_1.index)('waste_logs_logged_idx').on(t.loggedAt),
]);
// ============================================================================
// 5. DINING AREAS, FLOOR TABLES, RESERVATIONS & WAITLIST
// ============================================================================
exports.diningAreas = (0, pg_core_1.pgTable)('dining_areas', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(), // e.g., Main Floor, Terrace, VIP Lounge
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('dining_areas_tenant_branch_idx').on(t.tenantId, t.branchId),
]);
exports.restaurantTables = (0, pg_core_1.pgTable)('restaurant_tables', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    areaId: (0, pg_core_1.integer)('area_id')
        .references(() => exports.diningAreas.id, { onDelete: 'cascade' })
        .notNull(),
    tableLabel: (0, pg_core_1.varchar)('table_label', { length: 50 }).notNull(), // e.g., T1, T2, VIP-1
    capacity: (0, pg_core_1.integer)('capacity').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Available').notNull(), // Available, Occupied, Reserved, Cleaning
    assignedWaiterId: (0, pg_core_1.integer)('assigned_waiter_id').references(() => exports.users.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('tables_tenant_area_label_idx').on(t.tenantId, t.areaId, t.tableLabel),
    (0, pg_core_1.index)('tables_tenant_status_idx').on(t.tenantId, t.status),
]);
exports.reservations = (0, pg_core_1.pgTable)('reservations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    customerName: (0, pg_core_1.varchar)('customer_name', { length: 255 }).notNull(),
    customerPhone: (0, pg_core_1.varchar)('customer_phone', { length: 50 }).notNull(),
    customerEmail: (0, pg_core_1.varchar)('customer_email', { length: 255 }),
    partySize: (0, pg_core_1.integer)('party_size').notNull(),
    reservationDate: (0, pg_core_1.timestamp)('reservation_date', { withTimezone: true }).notNull(),
    expectedDuration: (0, pg_core_1.integer)('expected_duration').default(120).notNull(), // Minutes
    tableId: (0, pg_core_1.integer)('table_id').references(() => exports.restaurantTables.id, { onDelete: 'set null' }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Pending').notNull(), // Pending, Confirmed, Checked-In, Completed, Cancelled, No-Show
    specialRequests: (0, pg_core_1.text)('special_requests'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('reservations_tenant_date_idx').on(t.tenantId, t.reservationDate),
    (0, pg_core_1.index)('reservations_tenant_table_idx').on(t.tenantId, t.tableId),
]);
exports.waitlistEntries = (0, pg_core_1.pgTable)('waitlist_entries', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    customerName: (0, pg_core_1.varchar)('customer_name', { length: 255 }).notNull(),
    customerPhone: (0, pg_core_1.varchar)('customer_phone', { length: 50 }).notNull(),
    partySize: (0, pg_core_1.integer)('party_size').notNull(),
    quotedWaitTime: (0, pg_core_1.integer)('quoted_wait_time').notNull(), // Minutes
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Waiting').notNull(), // Waiting, Notified, Seated, Cancelled
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('waitlist_tenant_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// 6. ORDERS, ORDER ITEMS, KITCHEN TICKETS & DELIVERY
// ============================================================================
exports.orders = (0, pg_core_1.pgTable)('orders', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'restrict' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'restrict' }),
    tableId: (0, pg_core_1.integer)('table_id').references(() => exports.restaurantTables.id, { onDelete: 'set null' }),
    // Enterprise Table & Station Snapshot (Resolves SQLSTATE 42703)
    tableName: (0, pg_core_1.varchar)('table_name', { length: 100 }), // e.g. "Table 4 (Veranda)", "VIP Lounge", "Takeaway"
    waiterId: (0, pg_core_1.integer)('waiter_id').references(() => exports.users.id, { onDelete: 'set null' }),
    cashierId: (0, pg_core_1.integer)('cashier_id').references(() => exports.users.id, { onDelete: 'set null' }),
    orderNumber: (0, pg_core_1.varchar)('order_number', { length: 50 }).notNull(),
    orderType: (0, pg_core_1.varchar)('order_type', { length: 50 }).notNull(), // Dine-In, Takeaway, Delivery, Bar-Tab
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Draft').notNull(), // Draft, Confirmed, Sent-To-Kitchen, Preparing, Ready, Served, Completed, Cancelled
    paymentStatus: (0, pg_core_1.varchar)('payment_status', { length: 50 }).default('Pending').notNull(), // Pending, Partial, Paid, Refunded
    customerName: (0, pg_core_1.varchar)('customer_name', { length: 255 }),
    customerPhone: (0, pg_core_1.varchar)('customer_phone', { length: 50 }),
    buyerKraPin: (0, pg_core_1.varchar)('buyer_kra_pin', { length: 50 }), // Optional B2B KRA PIN for eTIMS receipt
    subtotal: (0, pg_core_1.decimal)('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountTotal: (0, pg_core_1.decimal)('discount_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
    tax: (0, pg_core_1.decimal)('tax', { precision: 12, scale: 2 }).notNull(), // VAT amount
    cateringLevy: (0, pg_core_1.decimal)('catering_levy', { precision: 12, scale: 2 }).default('0.00').notNull(),
    serviceCharge: (0, pg_core_1.decimal)('service_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
    deliveryFee: (0, pg_core_1.decimal)('delivery_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    total: (0, pg_core_1.decimal)('total', { precision: 12, scale: 2 }).notNull(), // Note: column name is 'total'
    amountPaid: (0, pg_core_1.decimal)('amount_paid', { precision: 12, scale: 2 }).default('0.00').notNull(),
    notes: (0, pg_core_1.text)('notes'),
    cancelReason: (0, pg_core_1.text)('cancel_reason'),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 100 }), // Offline sync & retry protection
    inventoryDeducted: (0, pg_core_1.boolean)('inventory_deducted').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('orders_tenant_number_idx').on(t.tenantId, t.orderNumber),
    (0, pg_core_1.uniqueIndex)('orders_idempotency_idx').on(t.tenantId, t.idempotencyKey),
    (0, pg_core_1.index)('orders_tenant_status_idx').on(t.tenantId, t.status, t.paymentStatus),
    (0, pg_core_1.index)('orders_tenant_created_idx').on(t.tenantId, t.createdAt),
    (0, pg_core_1.index)('orders_table_idx').on(t.tableId),
]);
exports.orderItems = (0, pg_core_1.pgTable)('order_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    orderId: (0, pg_core_1.integer)('order_id')
        .references(() => exports.orders.id, { onDelete: 'cascade' })
        .notNull(),
    menuItemId: (0, pg_core_1.integer)('menu_item_id')
        .references(() => exports.menuItems.id, { onDelete: 'restrict' })
        .notNull(),
    quantity: (0, pg_core_1.decimal)('quantity', { precision: 10, scale: 2 }).notNull(), // Supports integer portions + decimal weight (e.g. 0.75 kg nyama choma)
    unitPrice: (0, pg_core_1.decimal)('unit_price', { precision: 12, scale: 2 }).notNull(),
    modifiersPrice: (0, pg_core_1.decimal)('modifiers_price', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalPrice: (0, pg_core_1.decimal)('total_price', { precision: 12, scale: 2 }).notNull(),
    unitCostSnapshot: (0, pg_core_1.decimal)('unit_cost_snapshot', { precision: 12, scale: 2 }).default('0.00').notNull(), // Preserves historical COGS
    selectedModifiers: (0, pg_core_1.jsonb)('selected_modifiers').$type().default([]),
    kitchenStatus: (0, pg_core_1.varchar)('kitchen_status', { length: 50 }).default('New').notNull(), // New, Accepted, Preparing, Ready, Served, Cancelled
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('order_items_order_idx').on(t.orderId),
    (0, pg_core_1.index)('order_items_menu_item_idx').on(t.menuItemId),
]);
exports.stockMovements = (0, pg_core_1.pgTable)('stock_movements', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    // Enterprise Movement Type Classification
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    // 'GOODS_RECEIPT_PO', 'POS_RECIPE_DEPLETION', 'PHYSICAL_INVENTORY_ADJ', 'WASTE_SCRAP', 'SUPPLIER_RETURN', 'STORNO_REVERSAL', 'TRANSFER'
    quantity: (0, pg_core_1.decimal)('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    totalValuation: (0, pg_core_1.decimal)('total_valuation', { precision: 12, scale: 4 }).notNull(),
    balanceAfter: (0, pg_core_1.decimal)('balance_after', { precision: 12, scale: 4 }).notNull(),
    batchNumber: (0, pg_core_1.varchar)('batch_number', { length: 50 }),
    locationBin: (0, pg_core_1.varchar)('location_bin', { length: 80 }), // e.g. "Walk-in Chiller Rack 2B"
    documentReference: (0, pg_core_1.varchar)('document_reference', { length: 100 }), // e.g. "GRN-2026-001", "PO-2026-002"
    // Storno audit trail linking
    reversedMovementId: (0, pg_core_1.integer)('reversed_movement_id'),
    isReversed: (0, pg_core_1.boolean)('is_reversed').default(false).notNull(),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('stock_mov_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('stock_mov_item_idx').on(t.inventoryItemId),
    (0, pg_core_1.index)('stock_mov_type_idx').on(t.type),
    (0, pg_core_1.index)('stock_mov_created_idx').on(t.createdAt),
]);
exports.stockCounts = (0, pg_core_1.pgTable)('stock_counts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    countNumber: (0, pg_core_1.varchar)('count_number', { length: 50 }).notNull(), // e.g. "PI-2026-001"
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('IN_PROGRESS').notNull(), // 'IN_PROGRESS', 'PENDING_APPROVAL', 'RECONCILED', 'CANCELLED'
    countType: (0, pg_core_1.varchar)('count_type', { length: 30 }).default('FULL').notNull(), // 'FULL', 'CYCLE', 'SPOT_CHECK'
    category: (0, pg_core_1.varchar)('category', { length: 100 }), // null for full count
    isBlindCount: (0, pg_core_1.boolean)('is_blind_count').default(true).notNull(), // Hides book quantities from floor staff
    totalItemsCount: (0, pg_core_1.integer)('total_items_count').default(0).notNull(),
    discrepancyItemsCount: (0, pg_core_1.integer)('discrepancy_items_count').default(0).notNull(),
    netVarianceCost: (0, pg_core_1.decimal)('net_variance_cost', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    conductorId: (0, pg_core_1.integer)('conductor_id').references(() => exports.users.id, { onDelete: 'set null' }),
    approvedById: (0, pg_core_1.integer)('approved_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    reconciledAt: (0, pg_core_1.timestamp)('reconciled_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('stock_cnt_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('stock_cnt_status_idx').on(t.status),
]);
exports.stockCountItems = (0, pg_core_1.pgTable)('stock_count_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    stockCountId: (0, pg_core_1.integer)('stock_count_id')
        .notNull()
        .references(() => exports.stockCounts.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    expectedQuantity: (0, pg_core_1.decimal)('expected_quantity', { precision: 12, scale: 4 }).notNull(),
    countedQuantity: (0, pg_core_1.decimal)('counted_quantity', { precision: 12, scale: 4 }),
    varianceQuantity: (0, pg_core_1.decimal)('variance_quantity', { precision: 12, scale: 4 }),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    varianceCost: (0, pg_core_1.decimal)('variance_cost', { precision: 12, scale: 4 }),
    recountRequired: (0, pg_core_1.boolean)('recount_required').default(false).notNull(),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('stock_cnt_items_cnt_idx').on(t.stockCountId),
    (0, pg_core_1.index)('stock_cnt_items_inv_idx').on(t.inventoryItemId),
]);
exports.stockTransfers = (0, pg_core_1.pgTable)('stock_transfers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    transferNumber: (0, pg_core_1.varchar)('transfer_number', { length: 50 }).notNull(), // e.g. "STO-2026-001"
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('PENDING').notNull(),
    // 'PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'DISCREPANCY_COMPLETED', 'CANCELLED'
    sourceBranchId: (0, pg_core_1.integer)('source_branch_id')
        .notNull()
        .references(() => exports.branches.id, { onDelete: 'restrict' }),
    destinationBranchId: (0, pg_core_1.integer)('destination_branch_id')
        .notNull()
        .references(() => exports.branches.id, { onDelete: 'restrict' }),
    // Logistics & Transport Audit
    carrierVehiclePlate: (0, pg_core_1.varchar)('carrier_vehicle_plate', { length: 50 }), // e.g. "KBZ 412X (Reefer Van)"
    driverName: (0, pg_core_1.varchar)('driver_name', { length: 100 }),
    dispatchTempProbe: (0, pg_core_1.decimal)('dispatch_temp_probe', { precision: 5, scale: 2 }), // e.g. 3.2°C
    arrivalTempProbe: (0, pg_core_1.decimal)('arrival_temp_probe', { precision: 5, scale: 2 }),
    totalValuation: (0, pg_core_1.decimal)('total_valuation', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    transitLossValuation: (0, pg_core_1.decimal)('transit_loss_valuation', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    requestedById: (0, pg_core_1.integer)('requested_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    dispatchedById: (0, pg_core_1.integer)('dispatched_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    receivedById: (0, pg_core_1.integer)('received_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    dispatchedAt: (0, pg_core_1.timestamp)('dispatched_at', { withTimezone: true }),
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('sto_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('sto_status_idx').on(t.status),
    (0, pg_core_1.index)('sto_source_idx').on(t.sourceBranchId),
    (0, pg_core_1.index)('sto_dest_idx').on(t.destinationBranchId),
]);
exports.stockTransferItems = (0, pg_core_1.pgTable)('stock_transfer_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    transferId: (0, pg_core_1.integer)('transfer_id')
        .notNull()
        .references(() => exports.stockTransfers.id, { onDelete: 'cascade' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .notNull()
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' }),
    requestedQuantity: (0, pg_core_1.decimal)('requested_quantity', { precision: 12, scale: 4 }).notNull(),
    sentQuantity: (0, pg_core_1.decimal)('sent_quantity', { precision: 12, scale: 4 }),
    receivedQuantity: (0, pg_core_1.decimal)('received_quantity', { precision: 12, scale: 4 }),
    transitLossQuantity: (0, pg_core_1.decimal)('transit_loss_quantity', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    unitCost: (0, pg_core_1.decimal)('unit_cost', { precision: 12, scale: 4 }).notNull(),
    batchNumber: (0, pg_core_1.varchar)('batch_number', { length: 50 }),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('sto_items_transfer_idx').on(t.transferId),
    (0, pg_core_1.index)('sto_items_inv_idx').on(t.inventoryItemId),
]);
exports.logisticsFleet = (0, pg_core_1.pgTable)('logistics_fleet', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    vehiclePlate: (0, pg_core_1.varchar)('vehicle_plate', { length: 50 }).notNull(), // e.g. "KBZ 412X"
    vehicleType: (0, pg_core_1.varchar)('vehicle_type', { length: 50 }).default('REEFER_VAN').notNull(), // 'REEFER_VAN', 'BOX_TRUCK', 'PICKUP', 'MOTORBIKE'
    driverName: (0, pg_core_1.varchar)('driver_name', { length: 100 }),
    driverPhone: (0, pg_core_1.varchar)('driver_phone', { length: 30 }),
    isRefrigerated: (0, pg_core_1.boolean)('is_refrigerated').default(false).notNull(),
    minTargetTemp: (0, pg_core_1.decimal)('min_target_temp', { precision: 5, scale: 2 }), // e.g. 2.00
    maxTargetTemp: (0, pg_core_1.decimal)('max_target_temp', { precision: 5, scale: 2 }), // e.g. 8.00
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('fleet_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('fleet_plate_idx').on(t.vehiclePlate),
]);
exports.deliveryAssignments = (0, pg_core_1.pgTable)('delivery_assignments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    orderId: (0, pg_core_1.integer)('order_id')
        .references(() => exports.orders.id, { onDelete: 'cascade' })
        .notNull(),
    provider: (0, pg_core_1.varchar)('provider', { length: 100 }).default('In-House').notNull(), // In-House, Uber Direct, Bolt, Glovo, Little Cab
    driverName: (0, pg_core_1.varchar)('driver_name', { length: 255 }).notNull(),
    driverPhone: (0, pg_core_1.varchar)('driver_phone', { length: 50 }),
    deliveryAddress: (0, pg_core_1.text)('delivery_address'),
    trackingUrl: (0, pg_core_1.varchar)('tracking_url', { length: 500 }),
    deliveryFee: (0, pg_core_1.decimal)('delivery_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Assigned').notNull(), // Assigned, Dispatched, Delivered, Failed
    dispatchedAt: (0, pg_core_1.timestamp)('dispatched_at', { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('delivery_assignments_tenant_order_idx').on(t.tenantId, t.orderId),
]);
// ============================================================================
// 7. PAYMENTS, M-PESA DARAJA (STK + C2B TILL), SHIFTS & KRA eTIMS
// ============================================================================
exports.cashierShifts = (0, pg_core_1.pgTable)('cashier_shifts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'restrict' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'restrict' }),
    cashierId: (0, pg_core_1.integer)('cashier_id')
        .references(() => exports.users.id, { onDelete: 'restrict' })
        .notNull(),
    closedByUserId: (0, pg_core_1.integer)('closed_by_user_id').references(() => exports.users.id, {
        onDelete: 'set null',
    }),
    openingFloat: (0, pg_core_1.decimal)('opening_float', { precision: 12, scale: 2 }).default('0.00').notNull(),
    expectedCash: (0, pg_core_1.decimal)('expected_cash', { precision: 12, scale: 2 }).default('0.00').notNull(),
    countedCash: (0, pg_core_1.decimal)('counted_cash', { precision: 12, scale: 2 }),
    variance: (0, pg_core_1.decimal)('variance', { precision: 12, scale: 2 }),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('OPEN').notNull(), // OPEN, CLOSED
    varianceNotes: (0, pg_core_1.text)('variance_notes'),
    openedAt: (0, pg_core_1.timestamp)('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: (0, pg_core_1.timestamp)('closed_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('cashier_shifts_tenant_status_idx').on(t.tenantId, t.status),
]);
exports.payments = (0, pg_core_1.pgTable)('payments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    paymentNumber: (0, pg_core_1.varchar)('payment_number', { length: 50 }).notNull(), // e.g. "PMT-2026-001"
    // Enterprise Flow & Status
    paymentFlow: (0, pg_core_1.varchar)('payment_flow', { length: 30 }).notNull(), // 'OUTBOUND_AP', 'INBOUND_AR'
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('POSTED').notNull(),
    // 'POSTED', 'RECONCILED', 'CANCELLED_REVERSED', 'BOUNCED'
    // Method & Treasury Clearing Channel
    paymentMethod: (0, pg_core_1.varchar)('payment_method', { length: 50 }).notNull(),
    // 'MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH_DRAWER', 'CREDIT_CARD'
    clearingAccount: (0, pg_core_1.varchar)('clearing_account', { length: 100 }).notNull(),
    // e.g. "KCB Operating Account (KES)", "Safaricom B2B Paybill 55210", "Main Safe Petty Cash"
    transactionReference: (0, pg_core_1.varchar)('transaction_reference', { length: 100 }), // M-Pesa Code / Bank Slip # / Cheque #
    // Parties
    supplierId: (0, pg_core_1.integer)('supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    supplierInvoiceId: (0, pg_core_1.integer)('supplier_invoice_id').references(() => exports.supplierInvoices.id, { onDelete: 'set null' }),
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('KES').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 4 }).notNull(),
    // Storno Audit
    reversedPaymentId: (0, pg_core_1.integer)('reversed_payment_id'),
    isReversed: (0, pg_core_1.boolean)('is_reversed').default(false).notNull(),
    processedById: (0, pg_core_1.integer)('processed_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    reconciledAt: (0, pg_core_1.timestamp)('reconciled_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('pmt_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('pmt_flow_idx').on(t.paymentFlow),
    (0, pg_core_1.index)('pmt_status_idx').on(t.status),
    (0, pg_core_1.index)('pmt_supplier_idx').on(t.supplierId),
    (0, pg_core_1.index)('pmt_invoice_idx').on(t.supplierInvoiceId),
]);
exports.bankStatements = (0, pg_core_1.pgTable)('bank_statements', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    statementNumber: (0, pg_core_1.varchar)('statement_number', { length: 50 }).notNull(), // e.g. "BST-2026-001"
    clearingAccount: (0, pg_core_1.varchar)('clearing_account', { length: 100 }).notNull(), // Matching payments.clearingAccount
    openingBalance: (0, pg_core_1.decimal)('opening_balance', { precision: 12, scale: 4 }).notNull(),
    closingBalance: (0, pg_core_1.decimal)('closing_balance', { precision: 12, scale: 4 }).notNull(),
    statementDate: (0, pg_core_1.timestamp)('statement_date', { withTimezone: true }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('OPEN').notNull(), // 'OPEN', 'RECONCILED'
    createdById: (0, pg_core_1.integer)('created_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('bank_stmt_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('bank_stmt_acc_idx').on(t.clearingAccount),
]);
exports.bankStatementLines = (0, pg_core_1.pgTable)('bank_statement_lines', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    bankStatementId: (0, pg_core_1.integer)('bank_statement_id')
        .notNull()
        .references(() => exports.bankStatements.id, { onDelete: 'cascade' }),
    lineDate: (0, pg_core_1.timestamp)('line_date', { withTimezone: true }).notNull(),
    transactionReference: (0, pg_core_1.varchar)('transaction_reference', { length: 100 }), // Reference code on bank statement
    description: (0, pg_core_1.text)('description').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 4 }).notNull(), // Positive = Credit, Negative = Debit
    matchedPaymentId: (0, pg_core_1.integer)('matched_payment_id').references(() => exports.payments.id, { onDelete: 'set null' }),
    isReconciled: (0, pg_core_1.boolean)('is_reconciled').default(false).notNull(),
    reconciledAt: (0, pg_core_1.timestamp)('reconciled_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('bank_stmt_line_stmt_idx').on(t.bankStatementId),
    (0, pg_core_1.index)('bank_stmt_line_match_idx').on(t.matchedPaymentId),
]);
exports.mpesaTransactions = (0, pg_core_1.pgTable)('mpesa_transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    // Gateway Identifiers
    transactionType: (0, pg_core_1.varchar)('transaction_type', { length: 50 }).notNull(),
    // 'C2B_PAYBILL', 'C2B_BUY_GOODS', 'STK_PUSH', 'B2B_PAYBILL', 'B2B_BUY_GOODS', 'B2C_PAYOUT'
    mpesaReceiptNumber: (0, pg_core_1.varchar)('mpesa_receipt_number', { length: 50 }), // e.g. "QK8912KL99"
    checkoutRequestId: (0, pg_core_1.varchar)('checkout_request_id', { length: 100 }), // STK Push tracking
    conversationId: (0, pg_core_1.varchar)('conversation_id', { length: 100 }), // B2B / B2C tracking
    originatorConversationId: (0, pg_core_1.varchar)('originator_conversation_id', { length: 100 }),
    // Transaction Details
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 30 }),
    accountReference: (0, pg_core_1.varchar)('account_reference', { length: 100 }).notNull(), // Paybill Acc # or Invoice #
    businessShortCode: (0, pg_core_1.varchar)('business_short_code', { length: 50 }).notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 4 }).notNull(),
    transactionDate: (0, pg_core_1.timestamp)('transaction_date', { withTimezone: true }).defaultNow().notNull(),
    // Status
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('PENDING').notNull(),
    // 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'
    resultCode: (0, pg_core_1.varchar)('result_code', { length: 20 }),
    resultDesc: (0, pg_core_1.text)('result_desc'),
    // Counterparties & Links
    supplierId: (0, pg_core_1.integer)('supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    supplierInvoiceId: (0, pg_core_1.integer)('supplier_invoice_id').references(() => exports.supplierInvoices.id, { onDelete: 'set null' }),
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    paymentId: (0, pg_core_1.integer)('payment_id').references(() => exports.payments.id, { onDelete: 'set null' }),
    // Audit & Payload
    rawPayload: (0, pg_core_1.jsonb)('raw_payload'),
    initiatedById: (0, pg_core_1.integer)('initiated_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('mpesa_tx_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('mpesa_tx_receipt_idx').on(t.mpesaReceiptNumber),
    (0, pg_core_1.index)('mpesa_tx_status_idx').on(t.status),
    (0, pg_core_1.index)('mpesa_tx_type_idx').on(t.transactionType),
]);
exports.refunds = (0, pg_core_1.pgTable)('refunds', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    refundNumber: (0, pg_core_1.varchar)('refund_number', { length: 50 }).notNull(), // e.g. "REF-2026-001"
    // Enterprise Flow & Status
    refundFlow: (0, pg_core_1.varchar)('refund_flow', { length: 30 }).notNull(), // 'AR_CUSTOMER_REFUND', 'AP_VENDOR_REFUND'
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('APPROVED').notNull(), // 'APPROVED', 'PROCESSED', 'CANCELLED'
    // Links to Source Documents
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    supplierId: (0, pg_core_1.integer)('supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    paymentId: (0, pg_core_1.integer)('payment_id').references(() => exports.payments.id, { onDelete: 'set null' }),
    // Disbursement Channel
    refundMethod: (0, pg_core_1.varchar)('refund_method', { length: 50 }).notNull(), // 'MPESA_REFUND', 'BANK_WIRE', 'CASH_DRAWER'
    clearingAccount: (0, pg_core_1.varchar)('clearing_account', { length: 100 }).notNull(),
    transactionReference: (0, pg_core_1.varchar)('transaction_reference', { length: 100 }), // M-Pesa Code / Wire Ref
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('KES').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 4 }).notNull(),
    restockItems: (0, pg_core_1.boolean)('restock_items').default(true).notNull(),
    processedById: (0, pg_core_1.integer)('processed_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    reasonCode: (0, pg_core_1.varchar)('reason_code', { length: 100 }).notNull(), // 'DEFECTIVE_GOODS', 'CUSTOMER_CANCELLATION', 'PRICING_DISPUTE'
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('ref_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('ref_flow_idx').on(t.refundFlow),
    (0, pg_core_1.index)('ref_order_idx').on(t.orderId),
]);
exports.cashDrawers = (0, pg_core_1.pgTable)('cash_drawers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    drawerCode: (0, pg_core_1.varchar)('drawer_code', { length: 50 }).notNull(), // e.g. "POS-TERM-01"
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g. "Main Bar Cash Drawer"
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('CLOSED').notNull(), // 'OPEN', 'CLOSED'
    currentBalance: (0, pg_core_1.decimal)('current_balance', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('drawer_tenant_idx').on(t.tenantId),
]);
exports.drawerSessions = (0, pg_core_1.pgTable)('drawer_sessions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    drawerId: (0, pg_core_1.integer)('drawer_id')
        .notNull()
        .references(() => exports.cashDrawers.id, { onDelete: 'cascade' }),
    cashierId: (0, pg_core_1.integer)('cashier_id').references(() => exports.users.id, { onDelete: 'set null' }),
    supervisorId: (0, pg_core_1.integer)('supervisor_id').references(() => exports.users.id, { onDelete: 'set null' }),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('OPEN').notNull(),
    // 'OPEN', 'ACTIVE', 'COUNTED', 'CLOSED_RECONCILED'
    openingFloat: (0, pg_core_1.decimal)('opening_float', { precision: 12, scale: 4 }).notNull(),
    cashSalesTotal: (0, pg_core_1.decimal)('cash_sales_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    cashDropsTotal: (0, pg_core_1.decimal)('cash_drops_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    payoutsTotal: (0, pg_core_1.decimal)('payouts_total', { precision: 12, scale: 4 }).default('0.0000').notNull(),
    expectedClosingBalance: (0, pg_core_1.decimal)('expected_closing_balance', { precision: 12, scale: 4 }).notNull(),
    actualClosingBalance: (0, pg_core_1.decimal)('actual_closing_balance', { precision: 12, scale: 4 }),
    variance: (0, pg_core_1.decimal)('variance', { precision: 12, scale: 4 }), // Actual - Expected
    denominations: (0, pg_core_1.jsonb)('denominations').$type().default({}),
    openedAt: (0, pg_core_1.timestamp)('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: (0, pg_core_1.timestamp)('closed_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [
    (0, pg_core_1.index)('session_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('session_drawer_idx').on(t.drawerId),
    (0, pg_core_1.index)('session_status_idx').on(t.status),
]);
exports.mpesaC2bCallbacks = (0, pg_core_1.pgTable)('mpesa_c2b_callbacks', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'restrict' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    transId: (0, pg_core_1.varchar)('trans_id', { length: 50 }).notNull(), // 10-char M-Pesa Receipt Code
    transactionType: (0, pg_core_1.varchar)('transaction_type', { length: 50 }).notNull(), // CustomerBuyGoodsOnline / CustomerPayBillOnline
    transAmount: (0, pg_core_1.decimal)('trans_amount', { precision: 12, scale: 2 }).notNull(),
    businessShortCode: (0, pg_core_1.varchar)('business_short_code', { length: 30 }).notNull(),
    billRefNumber: (0, pg_core_1.varchar)('bill_ref_number', { length: 100 }),
    msisdn: (0, pg_core_1.varchar)('msisdn', { length: 100 }).notNull(), // Phone or hashed MSISDN
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    middleName: (0, pg_core_1.varchar)('middle_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    transTime: (0, pg_core_1.varchar)('trans_time', { length: 30 }).notNull(),
    allocationStatus: (0, pg_core_1.varchar)('allocation_status', { length: 30 })
        .default('UNALLOCATED')
        .notNull(), // UNALLOCATED, PARTIALLY_ALLOCATED, FULLY_ALLOCATED
    allocatedAmount: (0, pg_core_1.decimal)('allocated_amount', { precision: 12, scale: 2 })
        .default('0.00')
        .notNull(),
    claimedByUserId: (0, pg_core_1.integer)('claimed_by_user_id').references(() => exports.users.id, {
        onDelete: 'set null',
    }),
    claimedOrderId: (0, pg_core_1.integer)('claimed_order_id').references(() => exports.orders.id, {
        onDelete: 'set null',
    }),
    rawPayload: (0, pg_core_1.jsonb)('raw_payload'),
    claimedAt: (0, pg_core_1.timestamp)('claimed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('mpesa_c2b_tenant_trans_id_idx').on(t.tenantId, t.transId),
    (0, pg_core_1.index)('mpesa_c2b_unallocated_idx').on(t.tenantId, t.allocationStatus, t.createdAt),
]);
exports.fiscalInvoices = (0, pg_core_1.pgTable)('fiscal_invoices', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'restrict' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'restrict' }),
    orderId: (0, pg_core_1.integer)('order_id')
        .references(() => exports.orders.id, { onDelete: 'restrict' })
        .notNull(),
    invoiceType: (0, pg_core_1.varchar)('invoice_type', { length: 30 }).default('SALE').notNull(), // SALE, CREDIT_NOTE
    buyerKraPin: (0, pg_core_1.varchar)('buyer_kra_pin', { length: 50 }),
    cuInvoiceNumber: (0, pg_core_1.varchar)('cu_invoice_number', { length: 100 }), // KRA invcNo
    sdcId: (0, pg_core_1.varchar)('sdc_id', { length: 100 }), // KRA Control Unit ID
    internalData: (0, pg_core_1.text)('internal_data'),
    receiptSignature: (0, pg_core_1.text)('receipt_signature'),
    qrCodeUrl: (0, pg_core_1.text)('qr_code_url'),
    fiscalStatus: (0, pg_core_1.varchar)('fiscal_status', { length: 30 }).default('PENDING').notNull(), // PENDING, FISCALIZED, FAILED, EXEMPT
    retryCount: (0, pg_core_1.integer)('retry_count').default(0).notNull(),
    lastError: (0, pg_core_1.text)('last_error'),
    fiscalizedAt: (0, pg_core_1.timestamp)('fiscalized_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('fiscal_invoices_tenant_order_idx').on(t.tenantId, t.orderId),
    (0, pg_core_1.index)('fiscal_invoices_status_idx').on(t.tenantId, t.fiscalStatus),
]);
// ============================================================================
// 8. DRIZZLE ORM RELATIONAL DEFINITIONS (Enables db.query.<tableName>.findMany)
// ============================================================================
exports.tenantsRelations = (0, drizzle_orm_1.relations)(exports.tenants, ({ many }) => ({
    branches: many(exports.branches),
    users: many(exports.users),
    menuCategories: many(exports.menuCategories),
    menuItems: many(exports.menuItems),
    orders: many(exports.orders),
    inventoryItems: many(exports.inventoryItems),
}));
exports.branchesRelations = (0, drizzle_orm_1.relations)(exports.branches, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.branches.tenantId], references: [exports.tenants.id] }),
    diningAreas: many(exports.diningAreas),
    orders: many(exports.orders),
}));
exports.menuCategoriesRelations = (0, drizzle_orm_1.relations)(exports.menuCategories, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.menuCategories.tenantId], references: [exports.tenants.id] }),
    items: many(exports.menuItems),
}));
exports.menuItemsRelations = (0, drizzle_orm_1.relations)(exports.menuItems, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.menuItems.tenantId], references: [exports.tenants.id] }),
    category: one(exports.menuCategories, {
        fields: [exports.menuItems.categoryId],
        references: [exports.menuCategories.id],
    }),
    modifiers: many(exports.menuModifiers),
    recipes: many(exports.recipes),
}));
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.orders.tenantId], references: [exports.tenants.id] }),
    branch: one(exports.branches, { fields: [exports.orders.branchId], references: [exports.branches.id] }),
    table: one(exports.restaurantTables, { fields: [exports.orders.tableId], references: [exports.restaurantTables.id] }),
    items: many(exports.orderItems),
    payments: many(exports.payments),
    deliveryAssignments: many(exports.deliveryAssignments),
    fiscalInvoices: many(exports.fiscalInvoices),
}));
exports.orderItemsRelations = (0, drizzle_orm_1.relations)(exports.orderItems, ({ one }) => ({
    order: one(exports.orders, { fields: [exports.orderItems.orderId], references: [exports.orders.id] }),
    menuItem: one(exports.menuItems, { fields: [exports.orderItems.menuItemId], references: [exports.menuItems.id] }),
}));
exports.modifierGroups = (0, pg_core_1.pgTable)('modifier_groups', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(), // e.g., "Meat Temperature", "Extra Toppings"
    description: (0, pg_core_1.varchar)('description', { length: 255 }),
    minSelections: (0, pg_core_1.integer)('min_selections').default(0).notNull(), // 0 = optional, 1+ = required
    maxSelections: (0, pg_core_1.integer)('max_selections').default(1).notNull(), // 1 = radio/single, >1 = multiple
    isRequired: (0, pg_core_1.boolean)('is_required').default(false).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [(0, pg_core_1.index)('modifier_groups_tenant_idx').on(t.tenantId)]);
exports.modifierOptions = (0, pg_core_1.pgTable)('modifier_options', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    modifierGroupId: (0, pg_core_1.integer)('modifier_group_id').notNull().references(() => exports.modifierGroups.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(), // e.g., "Extra Cheddar", "Well Done"
    priceAdjustment: (0, pg_core_1.decimal)('price_adjustment', { precision: 10, scale: 2 }).default('0.00').notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    isAvailable: (0, pg_core_1.boolean)('is_available').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [(0, pg_core_1.index)('modifier_options_group_idx').on(t.modifierGroupId)]);
exports.comboBundles = (0, pg_core_1.pgTable)('combo_bundles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(), // e.g. "Family Feast Combo", "Burger & Shake Deal"
    description: (0, pg_core_1.text)('description'),
    sku: (0, pg_core_1.varchar)('sku', { length: 50 }),
    basePrice: (0, pg_core_1.decimal)('base_price', { precision: 10, scale: 2 }).notNull(),
    isAvailable: (0, pg_core_1.boolean)('is_available').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [(0, pg_core_1.index)('combo_bundles_tenant_idx').on(t.tenantId)]);
exports.comboBundleItems = (0, pg_core_1.pgTable)('combo_bundle_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    comboId: (0, pg_core_1.integer)('combo_id').notNull().references(() => exports.comboBundles.id, { onDelete: 'cascade' }),
    menuItemId: (0, pg_core_1.integer)('menu_item_id').notNull().references(() => exports.menuItems.id, { onDelete: 'cascade' }),
    quantity: (0, pg_core_1.integer)('quantity').default(1).notNull(),
    additionalPrice: (0, pg_core_1.decimal)('additional_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
}, (t) => [(0, pg_core_1.index)('combo_items_combo_idx').on(t.comboId)]);
exports.itemPricingRules = (0, pg_core_1.pgTable)('item_pricing_rules', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    menuItemId: (0, pg_core_1.integer)('menu_item_id').notNull().references(() => exports.menuItems.id, { onDelete: 'cascade' }),
    ruleName: (0, pg_core_1.varchar)('rule_name', { length: 150 }).notNull(), // e.g. "Happy Hour 20% Off", "VIP Lounge Surcharge"
    ruleType: (0, pg_core_1.varchar)('rule_type', { length: 50 }).notNull().default('FIXED_PRICE'), // 'FIXED_PRICE', 'PERCENTAGE_DISCOUNT', 'SURGE_ADDITION'
    value: (0, pg_core_1.decimal)('value', { precision: 10, scale: 2 }).notNull(), // Adjusted price or percentage
    startTime: (0, pg_core_1.varchar)('start_time', { length: 10 }), // e.g. "17:00"
    endTime: (0, pg_core_1.varchar)('end_time', { length: 10 }), // e.g. "20:00"
    daysOfWeek: (0, pg_core_1.varchar)('days_of_week', { length: 50 }), // e.g. "MON,TUE,WED,THU,FRI"
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('pricing_rules_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('pricing_rules_item_idx').on(t.menuItemId),
]);
exports.menuItemAvailability = (0, pg_core_1.pgTable)('menu_item_availability', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id').notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    menuItemId: (0, pg_core_1.integer)('menu_item_id').notNull().references(() => exports.menuItems.id, { onDelete: 'cascade' }),
    is86ed: (0, pg_core_1.boolean)('is_86ed').default(false).notNull(), // Out of stock / 86ed
    reason: (0, pg_core_1.varchar)('reason', { length: 150 }), // e.g. "Ran out of Brioche Buns", "86ed by Kitchen Chef"
    remainingCount: (0, pg_core_1.integer)('remaining_count'), // Nullable: if set, shows countdown (e.g. "Only 4 left")
    autoResetAt: (0, pg_core_1.timestamp)('auto_reset_at', { withTimezone: true }), // Scheduled restock time
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('item_avail_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('item_avail_menu_item_idx').on(t.menuItemId),
]);
exports.recipes = (0, pg_core_1.pgTable)('recipes', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' }),
    menuItemId: (0, pg_core_1.integer)('menu_item_id')
        .references(() => exports.menuItems.id, { onDelete: 'cascade' })
        .notNull(),
    version: (0, pg_core_1.integer)('version').default(1).notNull(),
    prepTimeMinutes: (0, pg_core_1.integer)('prep_time_minutes').default(15).notNull(),
    cookTimeMinutes: (0, pg_core_1.integer)('cook_time_minutes').default(10).notNull(),
    yieldPortions: (0, pg_core_1.decimal)('yield_portions', { precision: 10, scale: 2 }).default('1.00').notNull(),
    instructions: (0, pg_core_1.text)('instructions'),
    notes: (0, pg_core_1.text)('notes'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('recipes_tenant_menu_item_idx').on(t.tenantId, t.menuItemId, t.isActive),
]);
exports.recipeIngredients = (0, pg_core_1.pgTable)('recipe_ingredients', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    recipeId: (0, pg_core_1.integer)('recipe_id')
        .references(() => exports.recipes.id, { onDelete: 'cascade' })
        .notNull(),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .references(() => exports.inventoryItems.id, { onDelete: 'restrict' })
        .notNull(),
    quantity: (0, pg_core_1.decimal)('quantity', { precision: 12, scale: 4 }).notNull(),
    unit: (0, pg_core_1.varchar)('unit', { length: 50 }).notNull(),
    wastagePercentage: (0, pg_core_1.decimal)('wastage_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('recipe_ingredients_recipe_idx').on(t.recipeId),
]);
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }), // Nullable = broadcast to tenant/branch
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    detail: (0, pg_core_1.text)('detail').notNull(),
    severity: (0, pg_core_1.varchar)('severity', { length: 30 }).default('INFO').notNull(), // 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'
    module: (0, pg_core_1.varchar)('module', { length: 50 }).default('SYSTEM').notNull(), // 'INVENTORY', 'KDS', 'POS', 'FINANCE', 'AUTH'
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 100 }), // e.g. 'inventory_items', 'orders'
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 100 }), // e.g. item ID or order number
    actionUrl: (0, pg_core_1.varchar)('action_url', { length: 255 }), // Deep link to module, e.g. '/inventory/items'
    isRead: (0, pg_core_1.boolean)('is_read').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('notifications_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('notifications_unread_idx').on(t.tenantId, t.isRead),
    (0, pg_core_1.index)('notifications_severity_idx').on(t.tenantId, t.severity),
]);
exports.logisticsVehicles = (0, pg_core_1.pgTable)('logistics_vehicles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    primaryBranchId: (0, pg_core_1.integer)('primary_branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    plateNumber: (0, pg_core_1.varchar)('plate_number', { length: 30 }).notNull(), // e.g., KDA 412X
    makeModel: (0, pg_core_1.varchar)('make_model', { length: 100 }).notNull(), // e.g., Isuzu FRR / Toyota HiAce
    vehicleType: (0, pg_core_1.varchar)('vehicle_type', { length: 40 }).notNull().default('VAN'), // 'REFRIGERATED_TRUCK', 'VAN', 'MOTORCYCLE', 'PICKUP'
    driverName: (0, pg_core_1.varchar)('driver_name', { length: 120 }).notNull(),
    driverPhone: (0, pg_core_1.varchar)('driver_phone', { length: 30 }).notNull(),
    maxPayloadKg: (0, pg_core_1.numeric)('max_payload_kg', { precision: 10, scale: 2 }).notNull().default('1000.00'),
    temperatureControlled: (0, pg_core_1.boolean)('temperature_controlled').notNull().default(false),
    currentStatus: (0, pg_core_1.varchar)('current_status', { length: 30 }).notNull().default('AVAILABLE'), // 'AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'OFF_DUTY'
    currentLocationLat: (0, pg_core_1.numeric)('current_location_lat', { precision: 10, scale: 7 }),
    currentLocationLng: (0, pg_core_1.numeric)('current_location_lng', { precision: 10, scale: 7 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('logistics_vehicles_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('logistics_vehicles_status_idx').on(t.tenantId, t.currentStatus),
]);
exports.transferFleetDispatches = (0, pg_core_1.pgTable)('transfer_fleet_dispatches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    transferId: (0, pg_core_1.integer)('transfer_id')
        .notNull()
        .references(() => exports.stockTransfers.id, { onDelete: 'cascade' }),
    vehicleId: (0, pg_core_1.integer)('vehicle_id')
        .notNull()
        .references(() => exports.logisticsVehicles.id, { onDelete: 'restrict' }),
    dispatchedById: (0, pg_core_1.integer)('dispatched_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    dispatchStatus: (0, pg_core_1.varchar)('dispatch_status', { length: 30 }).notNull().default('LOADED'), // 'LOADED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'
    departureOdometerKm: (0, pg_core_1.numeric)('departure_odometer_km', { precision: 10, scale: 2 }),
    arrivalOdometerKm: (0, pg_core_1.numeric)('arrival_odometer_km', { precision: 10, scale: 2 }),
    departureTime: (0, pg_core_1.timestamp)('departure_time', { withTimezone: true }),
    arrivalTime: (0, pg_core_1.timestamp)('arrival_time', { withTimezone: true }),
    temperatureSetpointC: (0, pg_core_1.numeric)('temperature_setpoint_c', { precision: 5, scale: 2 }),
    temperatureActualArrivalC: (0, pg_core_1.numeric)('temperature_actual_arrival_c', { precision: 5, scale: 2 }),
    deliveryNotes: (0, pg_core_1.text)('delivery_notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('transfer_fleet_dispatches_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('transfer_fleet_dispatches_transfer_idx').on(t.transferId),
    (0, pg_core_1.index)('transfer_fleet_dispatches_vehicle_idx').on(t.vehicleId),
]);
