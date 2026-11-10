"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fiscalInvoices = exports.mpesaC2bCallbacks = exports.drawerSessions = exports.cashDrawers = exports.refunds = exports.mpesaTransactions = exports.bankStatementLines = exports.bankStatements = exports.payments = exports.cashierShifts = exports.deliveryAssignments = exports.transferFleetDispatches = exports.logisticsFleet = exports.logisticsVehicles = exports.stockTransferItems = exports.stockTransfers = exports.stockCountItems = exports.stockCounts = exports.stockMovements = exports.orderItems = exports.orders = exports.waitlistEntries = exports.reservations = exports.restaurantTables = exports.diningAreas = exports.wasteLogs = exports.warehouseLocations = exports.inventoryBatches = exports.unitConversions = exports.inventoryItems = exports.supplierReturnItems = exports.supplierReturns = exports.supplierInvoiceItems = exports.supplierInvoices = exports.goodsReceivedItems = exports.goodsReceivedNotes = exports.purchaseOrderItems = exports.purchaseOrders = exports.purchaseRequestItems = exports.purchaseRequests = exports.suppliers = exports.menuModifiers = exports.menuItems = exports.menuCategories = exports.userBranchMemberships = exports.roles = exports.users = exports.branches = exports.tenants = exports.userRoleEnum = void 0;
exports.supportTicketMessages = exports.supportTickets = exports.userSessions = exports.securitySettings = exports.billingInvoices = exports.tenantSubscriptions = exports.billingPaymentMethods = exports.subscriptionPlans = exports.deviceEnrollmentTokens = exports.posDevices = exports.offlineSyncBatches = exports.offlineSettings = exports.auditLogs = exports.orderIntegrationLogs = exports.orderIntegrations = exports.messagingLogs = exports.messagingTemplates = exports.messagingIntegrations = exports.paymentWebhookLogs = exports.paymentIntegrations = exports.kitchenGlobalSettings = exports.kitchenStations = exports.networkPrinters = exports.receiptTemplates = exports.serviceModels = exports.taxCodes = exports.tenantFinancialSettings = exports.staffPerformanceReviews = exports.cashierAssignments = exports.shiftHandovers = exports.attendanceRecords = exports.workSchedules = exports.shiftTemplates = exports.warehouseBins = exports.warehouseZones = exports.notifications = exports.recipeIngredients = exports.recipes = exports.menuItemAvailability = exports.itemPricingRules = exports.comboBundleItems = exports.comboBundles = exports.modifierOptions = exports.modifierGroups = exports.orderItemsRelations = exports.ordersRelations = exports.menuItemsRelations = exports.menuCategoriesRelations = exports.branchesRelations = exports.tenantsRelations = void 0;
exports.expenses = exports.expenseCategories = exports.workflowExecutionLogs = exports.workflowRules = exports.menuEngineeringSnapshots = exports.predictiveInventoryReplenishments = exports.hourlyForecastIntervals = exports.demandForecastSnapshots = exports.aiAssistantMessages = exports.aiAssistantSessions = exports.promotionalDiscounts = exports.marketingTemplates = exports.campaignRecipientsLog = exports.marketingCampaigns = exports.customerFeedback = exports.loyaltyTransactionsLedger = exports.loyaltyRewardsCatalog = exports.loyaltyPointTransactions = exports.customerLoyaltyProfiles = exports.loyaltyTiers = exports.customerInteractions = exports.customers = exports.reportSchedules = exports.reportExecutions = exports.reportDefinitions = exports.knowledgeBaseArticles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// 1. Define explicit role enum
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', [
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
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    defaultBranchId: (0, pg_core_1.integer)('default_branch_id').references(() => exports.branches.id, {
        onDelete: 'set null',
    }),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    pinHash: (0, pg_core_1.varchar)('pin_hash', { length: 255 }),
    // Use varchar instead of userRoleEnum to support dynamic tenant roles
    role: (0, pg_core_1.varchar)('role', { length: 100 }).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('users_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('users_tenant_branch_idx').on(t.tenantId, t.defaultBranchId),
    // Scopes email uniqueness to the tenant
    (0, pg_core_1.uniqueIndex)('users_tenant_email_idx').on(t.tenantId, t.email),
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
// 1. MASTER FLEET ASSET DIRECTORY (Unified from logistics_fleet)
exports.logisticsFleet = (0, pg_core_1.pgTable)('logistics_fleet', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    // Core Plate & Type
    vehiclePlate: (0, pg_core_1.varchar)('vehicle_plate', { length: 50 }).notNull(), // e.g. "KDE 321B"
    makeModel: (0, pg_core_1.varchar)('make_model', { length: 100 }).default('Standard Fleet').notNull(),
    vehicleType: (0, pg_core_1.varchar)('vehicle_type', { length: 50 }).default('REEFER_VAN').notNull(), // 'REEFER_VAN', 'BOX_TRUCK', 'PICKUP', 'MOTORBIKE'
    // Driver Details
    driverName: (0, pg_core_1.varchar)('driver_name', { length: 120 }),
    driverPhone: (0, pg_core_1.varchar)('driver_phone', { length: 30 }),
    // Payload & Capacity
    maxPayloadKg: (0, pg_core_1.numeric)('max_payload_kg', { precision: 10, scale: 2 }).default('1500.00').notNull(),
    // Cold-Chain Controls
    isRefrigerated: (0, pg_core_1.boolean)('is_refrigerated').default(false).notNull(),
    minTargetTemp: (0, pg_core_1.decimal)('min_target_temp', { precision: 5, scale: 2 }), // e.g. 2.00
    maxTargetTemp: (0, pg_core_1.decimal)('max_target_temp', { precision: 5, scale: 2 }), // e.g. 8.00
    // Live Operational Telemetry
    currentStatus: (0, pg_core_1.varchar)('current_status', { length: 30 }).default('AVAILABLE').notNull(), // 'AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'OFF_DUTY'
    currentLocationLat: (0, pg_core_1.numeric)('current_location_lat', { precision: 10, scale: 7 }),
    currentLocationLng: (0, pg_core_1.numeric)('current_location_lng', { precision: 10, scale: 7 }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('fleet_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('fleet_plate_idx').on(t.tenantId, t.vehiclePlate),
    (0, pg_core_1.index)('fleet_status_idx').on(t.tenantId, t.currentStatus),
]);
// 2. B2B INTER-BRANCH TRANSFERS DISPATCH WAYBILLS
exports.transferFleetDispatches = (0, pg_core_1.pgTable)('transfer_fleet_dispatches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    transferId: (0, pg_core_1.integer)('transfer_id')
        .notNull()
        .references(() => exports.stockTransfers.id, { onDelete: 'cascade' }),
    fleetVehicleId: (0, pg_core_1.integer)('fleet_vehicle_id')
        .notNull()
        .references(() => exports.logisticsFleet.id, { onDelete: 'restrict' }),
    dispatchedById: (0, pg_core_1.integer)('dispatched_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    dispatchStatus: (0, pg_core_1.varchar)('dispatch_status', { length: 30 }).default('IN_TRANSIT').notNull(), // 'IN_TRANSIT', 'DELIVERED', 'FAILED'
    departureOdometerKm: (0, pg_core_1.numeric)('departure_odometer_km', { precision: 10, scale: 2 }),
    arrivalOdometerKm: (0, pg_core_1.numeric)('arrival_odometer_km', { precision: 10, scale: 2 }),
    departureTime: (0, pg_core_1.timestamp)('departure_time', { withTimezone: true }).defaultNow(),
    arrivalTime: (0, pg_core_1.timestamp)('arrival_time', { withTimezone: true }),
    dispatchTempProbe: (0, pg_core_1.decimal)('dispatch_temp_probe', { precision: 5, scale: 2 }),
    arrivalTempProbe: (0, pg_core_1.decimal)('arrival_temp_probe', { precision: 5, scale: 2 }),
    deliveryNotes: (0, pg_core_1.text)('delivery_notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('transfer_dispatches_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('transfer_dispatches_transfer_idx').on(t.transferId),
    (0, pg_core_1.index)('transfer_dispatches_vehicle_idx').on(t.fleetVehicleId),
]);
// 3. B2C LAST-MILE CUSTOMER ORDER DELIVERIES
exports.deliveryAssignments = (0, pg_core_1.pgTable)('delivery_assignments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    orderId: (0, pg_core_1.integer)('order_id')
        .notNull()
        .references(() => exports.orders.id, { onDelete: 'cascade' }),
    provider: (0, pg_core_1.varchar)('provider', { length: 100 }).default('In-House').notNull(), // 'In-House', 'Uber Direct', 'Bolt', 'Glovo'
    fleetVehicleId: (0, pg_core_1.integer)('fleet_vehicle_id').references(() => exports.logisticsFleet.id, { onDelete: 'set null' }), // Optional link if in-house
    driverName: (0, pg_core_1.varchar)('driver_name', { length: 255 }).notNull(),
    driverPhone: (0, pg_core_1.varchar)('driver_phone', { length: 50 }),
    deliveryAddress: (0, pg_core_1.text)('delivery_address'),
    trackingUrl: (0, pg_core_1.varchar)('tracking_url', { length: 500 }),
    deliveryFee: (0, pg_core_1.decimal)('delivery_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Assigned').notNull(), // 'Assigned', 'Dispatched', 'Delivered', 'Failed'
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
// ============================================================================
// ENTERPRISE NOTIFICATIONS & ACTIONABLE ESCALATION FEED (WORKDAY / JOULE PARADIGM)
// ============================================================================
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }), // Nullable = broadcast to tenant/branch
    // Core Classification & Urgency
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    detail: (0, pg_core_1.text)('detail').notNull(),
    severity: (0, pg_core_1.varchar)('severity', { length: 30 }).default('INFO').notNull(), // 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'
    module: (0, pg_core_1.varchar)('module', { length: 50 }).default('SYSTEM').notNull(), // 'WORKFORCE_HCM', 'INVENTORY_SCM', 'KDS', 'POS', 'FINANCE', 'SECURITY'
    category: (0, pg_core_1.varchar)('category', { length: 50 }).default('ACTION_REQUIRED').notNull(), // 'ACTION_REQUIRED', 'FYI_STREAM', 'COMPLIANCE_AUDIT'
    // Deep Linking & Target Association
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 100 }), // e.g. 'purchase_orders', 'shift_schedules', 'orders'
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 100 }), // e.g. PO-AI-10293, orderId
    actionUrl: (0, pg_core_1.varchar)('action_url', { length: 255 }), // e.g. '/ai-assistant/inventory'
    // Enterprise Actionable Task Payload
    actionPayload: (0, pg_core_1.jsonb)('action_payload').$type(),
    // Lifecycle & Audit State
    isRead: (0, pg_core_1.boolean)('is_read').default(false).notNull(),
    isResolved: (0, pg_core_1.boolean)('is_resolved').default(false).notNull(),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    resolvedByUserId: (0, pg_core_1.integer)('resolved_by_user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('notifications_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('notifications_unread_idx').on(t.tenantId, t.isRead),
    (0, pg_core_1.index)('notifications_severity_idx').on(t.tenantId, t.severity),
    (0, pg_core_1.index)('notifications_category_idx').on(t.tenantId, t.category),
]);
// 1. STORAGE ZONES / WAREHOUSE AREAS (SAP Storage Types / NetSuite Zones)
exports.warehouseZones = (0, pg_core_1.pgTable)('warehouse_zones', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id')
        .notNull()
        .references(() => exports.branches.id, { onDelete: 'cascade' }),
    zoneCode: (0, pg_core_1.varchar)('zone_code', { length: 30 }).notNull(), // e.g., 'ZONE-CHILLER-01', 'AMB-DRY-MAIN'
    name: (0, pg_core_1.varchar)('name', { length: 120 }).notNull(), // e.g., 'Cold-Chain Dairy Chiller', 'Main Bulk Dry Storeroom'
    zoneType: (0, pg_core_1.varchar)('zone_type', { length: 40 }).notNull().default('INTERNAL_STORAGE'), // 'RECEIVING', 'INTERNAL_STORAGE', 'COLD_STORAGE', 'DEEP_FREEZE', 'STAGING_DISPATCH', 'QUARANTINE_SCRAP'
    temperatureMinC: (0, pg_core_1.numeric)('temperature_min_c', { precision: 5, scale: 2 }),
    temperatureMaxC: (0, pg_core_1.numeric)('temperature_max_c', { precision: 5, scale: 2 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('warehouse_zones_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('warehouse_zones_branch_idx').on(t.tenantId, t.branchId),
    (0, pg_core_1.index)('warehouse_zones_code_idx').on(t.tenantId, t.zoneCode),
]);
// 2. GRANULAR STORAGE BINS / SLOTS (SAP Bin Master Data / NetSuite Bins)
exports.warehouseBins = (0, pg_core_1.pgTable)('warehouse_bins', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    zoneId: (0, pg_core_1.integer)('zone_id')
        .notNull()
        .references(() => exports.warehouseZones.id, { onDelete: 'cascade' }),
    binCode: (0, pg_core_1.varchar)('bin_code', { length: 40 }).notNull(), // e.g., 'A01-R02-S03-B04'
    barcode: (0, pg_core_1.varchar)('barcode', { length: 80 }), // e.g., 'BIN-CBD-A01-02'
    binType: (0, pg_core_1.varchar)('bin_type', { length: 30 }).notNull().default('STANDARD_SHELF'), // 'STANDARD_SHELF', 'PALLET_RACK', 'FLOOR_BULK', 'LOCKER', 'REEFER_BIN'
    pickSequence: (0, pg_core_1.integer)('pick_sequence').notNull().default(10), // Optimized order picking wave route
    maxWeightKg: (0, pg_core_1.numeric)('max_weight_kg', { precision: 10, scale: 2 }).notNull().default('500.00'),
    maxVolumeCbm: (0, pg_core_1.numeric)('max_volume_cbm', { precision: 8, scale: 3 }).notNull().default('1.500'),
    isQuarantine: (0, pg_core_1.boolean)('is_quarantine').notNull().default(false), // Replaces scrap / damaged items isolation
    isOccupied: (0, pg_core_1.boolean)('is_occupied').notNull().default(false),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('warehouse_bins_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('warehouse_bins_zone_idx').on(t.zoneId),
    (0, pg_core_1.index)('warehouse_bins_code_idx').on(t.tenantId, t.binCode),
]);
// ============================================================================
// WORKFORCE ROSTERING & SHIFT SCHEDULING (HCM / WFM)
// ============================================================================
exports.shiftTemplates = (0, pg_core_1.pgTable)('shift_templates', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g. "Morning Opening", "Floor Midday", "Closing"
    startTime: (0, pg_core_1.varchar)('start_time', { length: 5 }).notNull(), // "07:00"
    endTime: (0, pg_core_1.varchar)('end_time', { length: 5 }).notNull(), // "15:30"
    breakMinutes: (0, pg_core_1.integer)('break_minutes').default(30).notNull(),
    colorHex: (0, pg_core_1.varchar)('color_hex', { length: 20 }).default('#0554F4').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('shift_templates_tenant_idx').on(t.tenantId),
]);
exports.workSchedules = (0, pg_core_1.pgTable)('work_schedules', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    templateId: (0, pg_core_1.integer)('template_id').references(() => exports.shiftTemplates.id, { onDelete: 'set null' }),
    shiftDate: (0, pg_core_1.date)('shift_date').notNull(), // "YYYY-MM-DD"
    startTime: (0, pg_core_1.varchar)('start_time', { length: 5 }).notNull(), // "08:00"
    endTime: (0, pg_core_1.varchar)('end_time', { length: 5 }).notNull(), // "16:30"
    breakMinutes: (0, pg_core_1.integer)('break_minutes').default(30).notNull(),
    role: (0, pg_core_1.varchar)('role', { length: 100 }).notNull(), // Operational clearance for this shift
    hourlyWage: (0, pg_core_1.numeric)('hourly_wage', { precision: 12, scale: 2 }).default('0.00'),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT | PUBLISHED | CONFIRMED | CANCELLED
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('work_schedules_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('work_schedules_tenant_date_idx').on(t.tenantId, t.shiftDate),
    (0, pg_core_1.index)('work_schedules_user_idx').on(t.userId),
    (0, pg_core_1.index)('work_schedules_branch_idx').on(t.branchId),
]);
// ============================================================================
// WORKFORCE TIME & ATTENDANCE LEDGER (HCM / TIME TRACKING)
// ============================================================================
exports.attendanceRecords = (0, pg_core_1.pgTable)('attendance_records', {
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
    scheduleId: (0, pg_core_1.integer)('schedule_id')
        .references(() => exports.workSchedules.id, { onDelete: 'set null' }), // Links planned shift to actual attendance
    clockInAt: (0, pg_core_1.timestamp)('clock_in_at', { withTimezone: true }).notNull(),
    clockOutAt: (0, pg_core_1.timestamp)('clock_out_at', { withTimezone: true }),
    clockInMethod: (0, pg_core_1.varchar)('clock_in_method', { length: 50 }).default('PIN').notNull(), // PIN | BIOMETRIC | PORTAL | NFC | MANUAL_OVERRIDE
    clockOutMethod: (0, pg_core_1.varchar)('clock_out_method', { length: 50 }),
    breakMinutes: (0, pg_core_1.integer)('break_minutes').default(0).notNull(),
    totalDurationMinutes: (0, pg_core_1.integer)('total_duration_minutes').default(0).notNull(),
    regularHours: (0, pg_core_1.numeric)('regular_hours', { precision: 6, scale: 2 }).default('0.00').notNull(),
    overtimeHours: (0, pg_core_1.numeric)('overtime_hours', { precision: 6, scale: 2 }).default('0.00').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ON_DUTY').notNull(), // ON_DUTY | COMPLETED | PENDING_REVIEW | APPROVED | REJECTED
    verificationStatus: (0, pg_core_1.varchar)('verification_status', { length: 50 }).default('VERIFIED').notNull(), // VERIFIED | LATE_ARRIVAL | EARLY_DEPARTURE | TIME_DISPUTE | MANUAL_ADJUSTMENT
    deviceInfo: (0, pg_core_1.varchar)('device_info', { length: 255 }),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 64 }),
    notes: (0, pg_core_1.text)('notes'),
    approvedByUserId: (0, pg_core_1.integer)('approved_by_user_id')
        .references(() => exports.users.id, { onDelete: 'set null' }),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('attendance_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('attendance_tenant_user_idx').on(t.tenantId, t.userId),
    (0, pg_core_1.index)('attendance_tenant_branch_idx').on(t.tenantId, t.branchId),
    (0, pg_core_1.index)('attendance_clock_in_idx').on(t.tenantId, t.clockInAt),
    (0, pg_core_1.index)('attendance_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// MANAGER SHIFT HANDOVERS & OPERATIONAL LOGBOOK (HCM / WFM)
// ============================================================================
exports.shiftHandovers = (0, pg_core_1.pgTable)('shift_handovers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    outgoingManagerId: (0, pg_core_1.integer)('outgoing_manager_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    incomingManagerId: (0, pg_core_1.integer)('incoming_manager_id')
        .references(() => exports.users.id, { onDelete: 'set null' }),
    shiftType: (0, pg_core_1.varchar)('shift_type', { length: 50 }).notNull(), // MORNING | MIDDAY | EVENING | NIGHT_CLOSING
    handoverDate: (0, pg_core_1.date)('handover_date').notNull(), // YYYY-MM-DD
    cashStatus: (0, pg_core_1.varchar)('cash_status', { length: 50 }).default('BALANCED').notNull(), // BALANCED | DISCREPANCY_SHORT | DISCREPANCY_OVER
    openingFloat: (0, pg_core_1.numeric)('opening_float', { precision: 12, scale: 2 }).default('0.00').notNull(),
    closingCash: (0, pg_core_1.numeric)('closing_cash', { precision: 12, scale: 2 }).default('0.00').notNull(),
    cashVariance: (0, pg_core_1.numeric)('cash_variance', { precision: 12, scale: 2 }).default('0.00').notNull(),
    operationalIncidents: (0, pg_core_1.text)('operational_incidents'),
    inventoryKitchenNotes: (0, pg_core_1.text)('inventory_kitchen_notes'),
    hardwareMaintenanceNotes: (0, pg_core_1.text)('hardware_maintenance_notes'),
    guestExperienceNotes: (0, pg_core_1.text)('guest_experience_notes'),
    checklistItems: (0, pg_core_1.jsonb)('checklist_items')
        .$type()
        .default([])
        .notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('SUBMITTED').notNull(), // DRAFT | SUBMITTED | ACKNOWLEDGED | DISPUTED
    outgoingSignedAt: (0, pg_core_1.timestamp)('outgoing_signed_at', { withTimezone: true }).defaultNow().notNull(),
    incomingSignedAt: (0, pg_core_1.timestamp)('incoming_signed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('shift_handovers_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('shift_handovers_tenant_date_idx').on(t.tenantId, t.handoverDate),
    (0, pg_core_1.index)('shift_handovers_tenant_branch_idx').on(t.tenantId, t.branchId),
    (0, pg_core_1.index)('shift_handovers_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// CASH DRAWER CUSTODIANS & CASHIER ASSIGNMENTS (HCM / TREASURY)
// ============================================================================
exports.cashierAssignments = (0, pg_core_1.pgTable)('cashier_assignments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    cashDrawerId: (0, pg_core_1.integer)('cash_drawer_id')
        .references(() => exports.cashDrawers.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    assignedByUserId: (0, pg_core_1.integer)('assigned_by_user_id')
        .references(() => exports.users.id, { onDelete: 'set null' })
        .notNull(),
    assignmentDate: (0, pg_core_1.date)('assignment_date').notNull(), // YYYY-MM-DD
    shiftType: (0, pg_core_1.varchar)('shift_type', { length: 50 }).default('MORNING').notNull(), // MORNING | MIDDAY | EVENING | NIGHT_CLOSING
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ASSIGNED').notNull(), // ASSIGNED | ACTIVE | RELEASED | REVOKED
    allocatedFloat: (0, pg_core_1.numeric)('allocated_float', { precision: 12, scale: 2 }).default('0.00').notNull(),
    maxCashLimit: (0, pg_core_1.numeric)('max_cash_limit', { precision: 12, scale: 2 }).default('50000.00').notNull(), // Threshold triggering mandatory safe drop
    allowRefunds: (0, pg_core_1.boolean)('allow_refunds').default(false).notNull(),
    allowDrawerPop: (0, pg_core_1.boolean)('allow_drawer_pop').default(true).notNull(),
    allowManualDiscount: (0, pg_core_1.boolean)('allow_manual_discount').default(false).notNull(),
    maxDiscountPercent: (0, pg_core_1.integer)('max_discount_percent').default(0).notNull(),
    activatedAt: (0, pg_core_1.timestamp)('activated_at', { withTimezone: true }),
    closedAt: (0, pg_core_1.timestamp)('closed_at', { withTimezone: true }),
    handoverNotes: (0, pg_core_1.text)('handover_notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('cashier_assignments_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('cashier_assignments_tenant_date_idx').on(t.tenantId, t.assignmentDate),
    (0, pg_core_1.index)('cashier_assignments_drawer_idx').on(t.cashDrawerId),
    (0, pg_core_1.index)('cashier_assignments_user_idx').on(t.userId),
    (0, pg_core_1.index)('cashier_assignments_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// EMPLOYEE PERFORMANCE APPRAISALS & KPI METRICS (HCM / TALENT MANAGEMENT)
// ============================================================================
exports.staffPerformanceReviews = (0, pg_core_1.pgTable)('staff_performance_reviews', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    reviewerId: (0, pg_core_1.integer)('reviewer_id')
        .references(() => exports.users.id, { onDelete: 'set null' })
        .notNull(),
    reviewCycle: (0, pg_core_1.varchar)('review_cycle', { length: 50 }).default('MONTHLY').notNull(), // MONTHLY | QUARTERLY | BIANNUAL | ANNUAL
    periodStart: (0, pg_core_1.date)('period_start').notNull(),
    periodEnd: (0, pg_core_1.date)('period_end').notNull(),
    overallRating: (0, pg_core_1.numeric)('overall_rating', { precision: 3, scale: 2 }).default('4.00').notNull(), // 1.00 - 5.00 Scale
    // Core Operational KPIs
    totalSalesGenerated: (0, pg_core_1.numeric)('total_sales_generated', { precision: 12, scale: 2 }).default('0.00').notNull(),
    salesTarget: (0, pg_core_1.numeric)('sales_target', { precision: 12, scale: 2 }).default('0.00').notNull(),
    averageTicketValue: (0, pg_core_1.numeric)('average_ticket_value', { precision: 10, scale: 2 }).default('0.00').notNull(),
    speedOfServiceMinutes: (0, pg_core_1.numeric)('speed_of_service_minutes', { precision: 5, scale: 1 }).default('0.0').notNull(),
    attendanceScorePercent: (0, pg_core_1.integer)('attendance_score_percent').default(100).notNull(),
    voidRefundCount: (0, pg_core_1.integer)('void_refund_count').default(0).notNull(),
    tipPoolAllocated: (0, pg_core_1.numeric)('tip_pool_allocated', { precision: 10, scale: 2 }).default('0.00').notNull(),
    // Competency Matrices (Communication, Punctuality, Culinary/Service Quality, Leadership)
    competencies: (0, pg_core_1.jsonb)('competencies')
        .$type()
        .default([])
        .notNull(),
    // SMART Goals & Development Objectives
    goals: (0, pg_core_1.jsonb)('goals')
        .$type()
        .default([])
        .notNull(),
    managerFeedback: (0, pg_core_1.text)('manager_feedback'),
    employeeFeedback: (0, pg_core_1.text)('employee_feedback'),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT | SUBMITTED | ACKNOWLEDGED | FINALIZED
    acknowledgedAt: (0, pg_core_1.timestamp)('acknowledged_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('perf_reviews_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('perf_reviews_user_idx').on(t.userId),
    (0, pg_core_1.index)('perf_reviews_cycle_idx').on(t.tenantId, t.reviewCycle),
    (0, pg_core_1.index)('perf_reviews_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// FINANCIAL SETTINGS, STATUTORY TAX CODES & FISCAL DEVICES (FIN / HCM)
// ============================================================================
exports.tenantFinancialSettings = (0, pg_core_1.pgTable)('tenant_financial_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .unique()
        .notNull(),
    baseCurrency: (0, pg_core_1.varchar)('base_currency', { length: 10 }).default('KES').notNull(),
    fiscalYearStartMonth: (0, pg_core_1.integer)('fiscal_year_start_month').default(1).notNull(), // 1 = January
    taxPin: (0, pg_core_1.varchar)('tax_pin', { length: 50 }), // e.g. KRA PIN (P051234567X)
    isVatInclusive: (0, pg_core_1.boolean)('is_vat_inclusive').default(true).notNull(), // Prices display inclusive of VAT
    vatRate: (0, pg_core_1.numeric)('vat_rate', { precision: 5, scale: 2 }).default('16.00').notNull(), // Standard VAT (16%)
    isCateringLevyEnabled: (0, pg_core_1.boolean)('is_catering_levy_enabled').default(true).notNull(),
    cateringLevyRate: (0, pg_core_1.numeric)('catering_levy_rate', { precision: 5, scale: 2 }).default('2.00').notNull(), // Tourism & Catering Levy (2%)
    isServiceChargeEnabled: (0, pg_core_1.boolean)('is_service_charge_enabled').default(false).notNull(),
    serviceChargeRate: (0, pg_core_1.numeric)('service_charge_rate', { precision: 5, scale: 2 }).default('5.00').notNull(),
    // Fiscal Device & eTIMS Architecture
    etimsEnvironment: (0, pg_core_1.varchar)('etims_environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    autoFiscalizeOnPayment: (0, pg_core_1.boolean)('auto_fiscalize_on_payment').default(true).notNull(),
    etimsMiddleServerUrl: (0, pg_core_1.varchar)('etims_middle_server_url', { length: 255 }),
    etimsDeviceSerial: (0, pg_core_1.varchar)('etims_device_serial', { length: 100 }), // e.g. OSCU-SDC-2026-001
    etimsBranchCode: (0, pg_core_1.varchar)('etims_branch_code', { length: 20 }).default('00').notNull(), // Default primary branch (00)
    allowOfflineFiscalSign: (0, pg_core_1.boolean)('allow_offline_fiscal_sign').default(true).notNull(),
    // HCM Labor & Tip Pooling Governance
    tipDistributionModel: (0, pg_core_1.varchar)('tip_distribution_model', { length: 50 }).default('HOURS_WEIGHTED').notNull(), // HOURS_WEIGHTED | EQUAL_SPLIT | ROLE_WEIGHTED
    defaultOvertimeMultiplier: (0, pg_core_1.numeric)('default_overtime_multiplier', { precision: 4, scale: 2 }).default('1.50').notNull(),
    holidayOvertimeMultiplier: (0, pg_core_1.numeric)('holiday_overtime_multiplier', { precision: 4, scale: 2 }).default('2.00').notNull(),
    standardWorkWeekHours: (0, pg_core_1.integer)('standard_work_week_hours').default(40).notNull(),
    // Treasury & Safe Drop Fiduciary Guardrails
    maxDrawerCashThreshold: (0, pg_core_1.numeric)('max_drawer_cash_threshold', { precision: 12, scale: 2 }).default('50000.00').notNull(),
    enableSafeDropAlerts: (0, pg_core_1.boolean)('enable_safe_drop_alerts').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('fin_settings_tenant_idx').on(t.tenantId),
]);
exports.taxCodes = (0, pg_core_1.pgTable)('tax_codes', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 20 }).notNull(), // e.g. "VAT-16", "EXEMPT", "ZERO-RATED"
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    rate: (0, pg_core_1.numeric)('rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    statutoryCode: (0, pg_core_1.varchar)('statutory_code', { length: 20 }), // e.g. KRA eTIMS Tax Code "A", "B", "C", "E"
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('tax_codes_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// HOSPITALITY SERVICE MODELS & FOH REVENUE CENTERS (OPS / FOH)
// ============================================================================
exports.serviceModels = (0, pg_core_1.pgTable)('service_models', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide templates
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g., "Full Table Service", "Express Counter", "Lounge & Bar Tab", "Drive-Thru"
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // DINE_IN | QUICK_SERVICE | BAR_TAB | TAKEAWAY | DELIVERY | DRIVE_THRU
    description: (0, pg_core_1.text)('description'),
    // Workflow & Guest Sequencing Flags
    requiresTable: (0, pg_core_1.boolean)('requires_table').default(true).notNull(),
    payBeforeOrder: (0, pg_core_1.boolean)('pay_before_order').default(false).notNull(), // Pre-pay (QSR) vs Post-pay (Dine-in)
    promptGuestCount: (0, pg_core_1.boolean)('prompt_guest_count').default(true).notNull(),
    allowSplitChecks: (0, pg_core_1.boolean)('allow_split_checks').default(true).notNull(),
    allowTableTransfers: (0, pg_core_1.boolean)('allow_table_transfers').default(true).notNull(),
    // Kitchen Display (KDS) & Expediter Rules
    autoSendToKitchen: (0, pg_core_1.boolean)('auto_send_to_kitchen').default(false).notNull(),
    enableCoursePacing: (0, pg_core_1.boolean)('enable_course_pacing').default(false).notNull(), // Starters, Mains, Desserts
    requireSeatNumbering: (0, pg_core_1.boolean)('require_seat_numbering').default(false).notNull(),
    // Surcharges & Gratuity
    autoApplyServiceCharge: (0, pg_core_1.boolean)('auto_apply_service_charge').default(false).notNull(),
    serviceChargePercent: (0, pg_core_1.numeric)('service_charge_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    packingChargeAmount: (0, pg_core_1.numeric)('packing_charge_amount', { precision: 8, scale: 2 }).default('0.00').notNull(),
    // Bar & Tab Fiduciary Controls
    preAuthCardRequired: (0, pg_core_1.boolean)('pre_auth_card_required').default(false).notNull(),
    maxTabCreditLimit: (0, pg_core_1.numeric)('max_tab_credit_limit', { precision: 12, scale: 2 }).default('0.00').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('service_models_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('service_models_type_idx').on(t.tenantId, t.type),
]);
// ============================================================================
// RECEIPT TEMPLATES & THERMAL INVOICE FORMATTING (OPS / POS)
// ============================================================================
exports.receiptTemplates = (0, pg_core_1.pgTable)('receipt_templates', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable for global tenant default
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g. "Standard 80mm Dining Bill", "58mm Bar Slip", "A4 Corporate Tax Invoice"
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    paperWidth: (0, pg_core_1.varchar)('paper_width', { length: 20 }).default('80MM').notNull(), // 80MM | 58MM | A4_INVOICE
    fontScale: (0, pg_core_1.varchar)('font_scale', { length: 20 }).default('NORMAL').notNull(), // COMPACT | NORMAL | LARGE
    // Header & Identity Configuration
    headerTitle: (0, pg_core_1.varchar)('header_title', { length: 150 }).notNull(),
    headerSubtitle: (0, pg_core_1.varchar)('header_subtitle', { length: 255 }),
    showLogo: (0, pg_core_1.boolean)('show_logo').default(true).notNull(),
    showBranchAddress: (0, pg_core_1.boolean)('show_branch_address').default(true).notNull(),
    showTaxPin: (0, pg_core_1.boolean)('show_tax_pin').default(true).notNull(),
    showContactPhone: (0, pg_core_1.boolean)('show_contact_phone').default(true).notNull(),
    showContactEmail: (0, pg_core_1.boolean)('show_contact_email').default(false).notNull(),
    // Transaction & Staff Metadata
    showCashierName: (0, pg_core_1.boolean)('show_cashier_name').default(true).notNull(),
    showServerName: (0, pg_core_1.boolean)('show_server_name').default(true).notNull(),
    showTableNumber: (0, pg_core_1.boolean)('show_table_number').default(true).notNull(),
    showCustomerDetails: (0, pg_core_1.boolean)('show_customer_details').default(true).notNull(),
    showOrderType: (0, pg_core_1.boolean)('show_order_type').default(true).notNull(),
    // Line Item & Kitchen Attributes
    showItemSku: (0, pg_core_1.boolean)('show_item_sku').default(false).notNull(),
    showItemModifiers: (0, pg_core_1.boolean)('show_item_modifiers').default(true).notNull(),
    showKitchenNotes: (0, pg_core_1.boolean)('show_kitchen_notes').default(false).notNull(),
    // Tax, Settlement & eTIMS Compliance
    showTaxSummary: (0, pg_core_1.boolean)('show_tax_summary').default(true).notNull(),
    showEtimsQrCode: (0, pg_core_1.boolean)('show_etims_qr_code').default(true).notNull(),
    showFiscalDeviceSerial: (0, pg_core_1.boolean)('show_fiscal_device_serial').default(true).notNull(),
    showPaymentBreakdown: (0, pg_core_1.boolean)('show_payment_breakdown').default(true).notNull(),
    showChangeDue: (0, pg_core_1.boolean)('show_change_due').default(true).notNull(),
    showTipPromptLine: (0, pg_core_1.boolean)('show_tip_prompt_line').default(false).notNull(),
    showLoyaltyPoints: (0, pg_core_1.boolean)('show_loyalty_points').default(true).notNull(),
    // Footer & Customer Messaging
    footerMessage: (0, pg_core_1.text)('footer_message'),
    returnPolicy: (0, pg_core_1.text)('return_policy'),
    wifiDetails: (0, pg_core_1.varchar)('wifi_details', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('receipt_templates_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('receipt_templates_branch_idx').on(t.branchId),
]);
// ============================================================================
// NETWORK HARDWARE, KITCHEN PRINTERS & PERIPHERALS (OPS / HARDWARE)
// ============================================================================
exports.networkPrinters = (0, pg_core_1.pgTable)('network_printers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g. "Main Cashier Till Printer", "Hot Kitchen Grill Printer", "Bar Dispense"
    deviceType: (0, pg_core_1.varchar)('device_type', { length: 50 }).notNull(), // RECEIPT | KITCHEN | BAR | LABEL | FISCAL_BOX
    connectionType: (0, pg_core_1.varchar)('connection_type', { length: 50 }).default('NETWORK_TCP').notNull(), // NETWORK_TCP | USB | BLUETOOTH | SERIAL
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 64 }), // e.g. "192.168.1.200"
    port: (0, pg_core_1.integer)('port').default(9100).notNull(), // Standard RAW ESC/POS port
    macAddress: (0, pg_core_1.varchar)('mac_address', { length: 64 }),
    driverProtocol: (0, pg_core_1.varchar)('driver_protocol', { length: 50 }).default('ESC_POS').notNull(), // ESC_POS | STAR_LINE | TSPL | EPSON_XML
    paperWidth: (0, pg_core_1.varchar)('paper_width', { length: 20 }).default('80MM').notNull(), // 80MM | 58MM
    autoCut: (0, pg_core_1.boolean)('auto_cut').default(true).notNull(),
    openCashDrawerOnPrint: (0, pg_core_1.boolean)('open_cash_drawer_on_print').default(false).notNull(),
    beepOnPrint: (0, pg_core_1.boolean)('beep_on_print').default(false).notNull(),
    beepCount: (0, pg_core_1.integer)('beep_count').default(1).notNull(),
    backupPrinterId: (0, pg_core_1.integer)('backup_printer_id'), // Automatic failover redirect if device is unreachable
    assignedStations: (0, pg_core_1.jsonb)('assigned_stations')
        .$type()
        .default([])
        .notNull(), // e.g. ["GRILL", "FRYER", "COLD_PREP", "BAR"]
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ONLINE').notNull(), // ONLINE | OFFLINE | ERROR | UNKNOWN
    lastPingAt: (0, pg_core_1.timestamp)('last_ping_at', { withTimezone: true }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('network_printers_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('network_printers_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('network_printers_type_idx').on(t.tenantId, t.deviceType),
]);
// ============================================================================
// KDS STATIONS, ORDER ROUTING RULES & CULINARY SLA (OPS / KITCHEN)
// ============================================================================
exports.kitchenStations = (0, pg_core_1.pgTable)('kitchen_stations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g. "Hot Grill & Broiler", "Cold Pantry & Salads", "Master Expediter"
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(), // e.g. "KDS-GRILL", "KDS-COLD", "KDS-EXPO"
    stationType: (0, pg_core_1.varchar)('station_type', { length: 50 }).default('PREP').notNull(), // PREP | EXPEDITER | PASS | BAR | PACKING
    colorHex: (0, pg_core_1.varchar)('color_hex', { length: 20 }).default('#0554F4').notNull(),
    targetPrepTimeMinutes: (0, pg_core_1.integer)('target_prep_time_minutes').default(15).notNull(), // Standard target cook duration
    warningTimeMinutes: (0, pg_core_1.integer)('warning_time_minutes').default(10).notNull(), // Amber alert threshold
    criticalTimeMinutes: (0, pg_core_1.integer)('critical_time_minutes').default(18).notNull(), // Flashing red overdue alert
    assignedCategories: (0, pg_core_1.jsonb)('assigned_stations')
        .$type()
        .default([])
        .notNull(), // e.g. ["Steaks & Grill", "Burgers", "Hot Sides"]
    autoBumpOnPrint: (0, pg_core_1.boolean)('auto_bump_on_print').default(false).notNull(),
    soundAlertOnNewTicket: (0, pg_core_1.boolean)('sound_alert_on_new_ticket').default(true).notNull(),
    allowTicketRecall: (0, pg_core_1.boolean)('allow_ticket_recall').default(true).notNull(),
    backupStationId: (0, pg_core_1.integer)('backup_station_id'), // Automatic failover redirect if station terminal drops
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('kitchen_stations_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('kitchen_stations_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('kitchen_stations_type_idx').on(t.tenantId, t.stationType),
]);
exports.kitchenGlobalSettings = (0, pg_core_1.pgTable)('kitchen_global_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .unique()
        .notNull(),
    defaultWarningMinutes: (0, pg_core_1.integer)('default_warning_minutes').default(10).notNull(),
    defaultCriticalMinutes: (0, pg_core_1.integer)('default_critical_minutes').default(18).notNull(),
    enableCoursePacing: (0, pg_core_1.boolean)('enable_course_pacing').default(true).notNull(), // Hold mains until starters are bumped
    enableOrderConsolidation: (0, pg_core_1.boolean)('enable_order_consolidation').default(true).notNull(), // Group identical SKUs across tickets
    vipPriorityBoostMinutes: (0, pg_core_1.integer)('vip_priority_boost_minutes').default(5).notNull(), // Subtract from timer to prioritize
    deliveryPriorityBoostMinutes: (0, pg_core_1.integer)('delivery_priority_boost_minutes').default(3).notNull(),
    soundVolume: (0, pg_core_1.integer)('sound_volume').default(80).notNull(), // 0 - 100%
    autoArchiveCompletedMinutes: (0, pg_core_1.integer)('auto_archive_completed_minutes').default(120).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('kitchen_global_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// PAYMENT INTEGRATION GATEWAYS & TRANSACTION ADAPTERS (FIN / PAYMENTS)
// ============================================================================
exports.paymentIntegrations = (0, pg_core_1.pgTable)('payment_integrations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide gateway
    provider: (0, pg_core_1.varchar)('provider', { length: 50 }).notNull(), // MPESA_DARAJA | STRIPE | PESAPAL | DPO_PAY | FLUTTERWAVE | ADYEN | MANUAL_PDQ
    title: (0, pg_core_1.varchar)('title', { length: 100 }).notNull(), // e.g. "Main M-Pesa Buy Goods Till", "Stripe Card Terminal Gateway"
    environment: (0, pg_core_1.varchar)('environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    // Gateway Credentials & Cryptographic Secrets
    merchantIdentifier: (0, pg_core_1.varchar)('merchant_identifier', { length: 100 }).notNull(), // Paybill/Till number, Stripe Account ID, Merchant ID
    apiKey: (0, pg_core_1.text)('api_key').notNull(), // Consumer Key / Public Key
    apiSecret: (0, pg_core_1.text)('api_secret').notNull(), // Consumer Secret / Restricted Secret Key
    passKey: (0, pg_core_1.text)('pass_key'), // Daraja Online Passkey / Webhook Secret Key
    webhookSecret: (0, pg_core_1.text)('webhook_secret'),
    callbackUrl: (0, pg_core_1.text)('callback_url'),
    // Routing & Settlement Preferences
    supportedCurrencies: (0, pg_core_1.jsonb)('supported_currencies')
        .$type()
        .default(['KES'])
        .notNull(),
    autoReconcile: (0, pg_core_1.boolean)('auto_reconcile').default(true).notNull(),
    settlementAccountCode: (0, pg_core_1.varchar)('settlement_account_code', { length: 50 }), // General Ledger bank clearing account code
    surchargePercent: (0, pg_core_1.numeric)('surcharge_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    // Health & Audit Metrics
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('INACTIVE').notNull(), // ACTIVE | INACTIVE | ERROR | SUSPENDED
    lastHandshakeAt: (0, pg_core_1.timestamp)('last_handshake_at', { withTimezone: true }),
    lastHandshakeStatus: (0, pg_core_1.varchar)('last_handshake_status', { length: 50 }),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('payment_integrations_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('payment_integrations_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('payment_integrations_provider_idx').on(t.tenantId, t.provider),
    (0, pg_core_1.index)('payment_integrations_status_idx').on(t.tenantId, t.status),
]);
exports.paymentWebhookLogs = (0, pg_core_1.pgTable)('payment_webhook_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    integrationId: (0, pg_core_1.integer)('integration_id')
        .references(() => exports.paymentIntegrations.id, { onDelete: 'cascade' })
        .notNull(),
    provider: (0, pg_core_1.varchar)('provider', { length: 50 }).notNull(),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 100 }).notNull(), // e.g. "C2B_VALIDATION", "STK_CALLBACK", "PAYMENT_INTENT_SUCCEEDED"
    externalReference: (0, pg_core_1.varchar)('external_reference', { length: 100 }), // Transaction ID (e.g. M-Pesa Receipt Number)
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    responseCode: (0, pg_core_1.integer)('response_code').default(200).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('PROCESSED').notNull(), // PROCESSED | FAILED | REJECTED
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('payment_webhooks_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('payment_webhooks_integration_idx').on(t.integrationId),
]);
// ============================================================================
// ENTERPRISE MESSAGING, SMS & NOTIFICATION GATEWAYS (HCM / COMMS)
// ============================================================================
exports.messagingIntegrations = (0, pg_core_1.pgTable)('messaging_integrations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide gateways
    channel: (0, pg_core_1.varchar)('channel', { length: 30 }).notNull(), // SMS | WHATSAPP | EMAIL | WEBHOOK
    provider: (0, pg_core_1.varchar)('provider', { length: 50 }).notNull(), // AFRICAS_TALKING | TWILIO | ADVANTA_SMS | SAFARICOM_BULK_SMS | INFOBIP | SENDGRID | RESEND | AWS_SES | CUSTOM_WEBHOOK
    title: (0, pg_core_1.varchar)('title', { length: 100 }).notNull(),
    environment: (0, pg_core_1.varchar)('environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    // Gateway Credentials & Originator Attributes
    senderId: (0, pg_core_1.varchar)('sender_id', { length: 50 }), // Alphanumeric Sender ID or WhatsApp verified number
    accountIdentifier: (0, pg_core_1.varchar)('account_identifier', { length: 150 }).notNull(), // Username / Account SID / App ID
    apiKey: (0, pg_core_1.text)('api_key').notNull(), // Primary API token / Auth token
    apiSecret: (0, pg_core_1.text)('api_secret'), // Optional private secret / webhook signing secret
    webhookUrl: (0, pg_core_1.text)('webhook_url'), // Inbound delivery report (DLR) webhook
    // Quota & Rate Guardrails
    monthlyCreditCap: (0, pg_core_1.integer)('monthly_credit_cap').default(0).notNull(), // 0 = unlimited
    currentMonthDispatches: (0, pg_core_1.integer)('current_month_dispatches').default(0).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE | INACTIVE | ERROR | SUSPENDED
    lastHandshakeAt: (0, pg_core_1.timestamp)('last_handshake_at', { withTimezone: true }),
    lastHandshakeStatus: (0, pg_core_1.varchar)('last_handshake_status', { length: 50 }),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('messaging_integrations_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('messaging_integrations_channel_idx').on(t.tenantId, t.channel),
    (0, pg_core_1.index)('messaging_integrations_provider_idx').on(t.tenantId, t.provider),
    (0, pg_core_1.index)('messaging_integrations_status_idx').on(t.tenantId, t.status),
]);
exports.messagingTemplates = (0, pg_core_1.pgTable)('messaging_templates', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    triggerEvent: (0, pg_core_1.varchar)('trigger_event', { length: 100 }).notNull(), // SHIFT_SCHEDULED | SHIFT_REMINDER | LATE_CLOCK_IN | HANDOVER_PENDING | RECEIPT_DISPATCH | SAFE_DROP_ALERT
    channel: (0, pg_core_1.varchar)('channel', { length: 30 }).notNull(), // SMS | WHATSAPP | EMAIL
    subject: (0, pg_core_1.varchar)('subject', { length: 200 }), // Required for EMAIL channel
    bodyTemplate: (0, pg_core_1.text)('body_template').notNull(), // Contains merge tags: {{employee_name}}, {{shift_date}}, {{start_time}}, etc.
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('messaging_templates_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('messaging_templates_event_idx').on(t.tenantId, t.triggerEvent),
]);
exports.messagingLogs = (0, pg_core_1.pgTable)('messaging_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    integrationId: (0, pg_core_1.integer)('integration_id')
        .references(() => exports.messagingIntegrations.id, { onDelete: 'set null' }),
    recipient: (0, pg_core_1.varchar)('recipient', { length: 150 }).notNull(), // Phone number or email
    channel: (0, pg_core_1.varchar)('channel', { length: 30 }).notNull(),
    triggerEvent: (0, pg_core_1.varchar)('trigger_event', { length: 100 }),
    bodyContent: (0, pg_core_1.text)('body_content').notNull(),
    externalMessageId: (0, pg_core_1.varchar)('external_message_id', { length: 150 }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('DELIVERED').notNull(), // QUEUED | SENT | DELIVERED | FAILED
    costUnits: (0, pg_core_1.numeric)('cost_units', { precision: 8, scale: 2 }).default('1.00').notNull(),
    dispatchedAt: (0, pg_core_1.timestamp)('dispatched_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('messaging_logs_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('messaging_logs_recipient_idx').on(t.tenantId, t.recipient),
    (0, pg_core_1.index)('messaging_logs_dispatched_idx').on(t.tenantId, t.dispatchedAt),
]);
// ============================================================================
// OMNICHANNEL ORDER INTEGRATIONS & AGGREGATORS (OPS / COMMERCE)
// ============================================================================
exports.orderIntegrations = (0, pg_core_1.pgTable)('order_integrations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable for tenant-wide templates
    channel: (0, pg_core_1.varchar)('channel', { length: 50 }).notNull(), // GLOVO | UBER_EATS | BOLT_FOOD | DOORDASH | SHOPIFY | WOOCOMMERCE | CUSTOM_WEBHOOK
    title: (0, pg_core_1.varchar)('title', { length: 100 }).notNull(),
    environment: (0, pg_core_1.varchar)('environment', { length: 20 }).default('SANDBOX').notNull(), // SANDBOX | PRODUCTION
    // Gateway Credentials & Store Identification
    storeIdentifier: (0, pg_core_1.varchar)('store_identifier', { length: 150 }).notNull(), // External Store UUID / Aggregator Location ID
    apiKey: (0, pg_core_1.text)('api_key').notNull(),
    apiSecret: (0, pg_core_1.text)('api_secret'),
    webhookSecret: (0, pg_core_1.text)('webhook_secret'),
    callbackUrl: (0, pg_core_1.text)('callback_url'),
    // Automation & Operational Pacing
    autoAcceptOrders: (0, pg_core_1.boolean)('auto_accept_orders').default(false).notNull(),
    autoSendToKitchen: (0, pg_core_1.boolean)('auto_send_to_kitchen').default(true).notNull(),
    priceMarkupPercent: (0, pg_core_1.numeric)('price_markup_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
    defaultPrepTimeMinutes: (0, pg_core_1.integer)('default_prep_time_minutes').default(20).notNull(),
    // Status & Telemetry
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE | INACTIVE | PAUSED | ERROR
    lastSyncAt: (0, pg_core_1.timestamp)('last_sync_at', { withTimezone: true }),
    lastSyncStatus: (0, pg_core_1.varchar)('last_sync_status', { length: 50 }),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('order_integrations_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('order_integrations_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('order_integrations_channel_idx').on(t.tenantId, t.channel),
    (0, pg_core_1.index)('order_integrations_status_idx').on(t.tenantId, t.status),
]);
exports.orderIntegrationLogs = (0, pg_core_1.pgTable)('order_integration_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    integrationId: (0, pg_core_1.integer)('integration_id')
        .references(() => exports.orderIntegrations.id, { onDelete: 'cascade' })
        .notNull(),
    channel: (0, pg_core_1.varchar)('channel', { length: 50 }).notNull(),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 100 }).notNull(), // ORDER_CREATED | ORDER_UPDATED | ORDER_CANCELLED | MENU_SYNC | STORE_STATUS
    externalOrderId: (0, pg_core_1.varchar)('external_order_id', { length: 150 }),
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('SUCCESS').notNull(), // SUCCESS | FAILED | REJECTED | IGNORED
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('order_logs_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('order_logs_integration_idx').on(t.integrationId),
    (0, pg_core_1.index)('order_logs_received_idx').on(t.tenantId, t.receivedAt),
]);
// ============================================================================
// ENTERPRISE AUDIT TRAIL, SECURITY & COMPLIANCE LOGS (HCM / GOVERNANCE)
// ============================================================================
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
// OFFLINE SURVIVABILITY, LOCAL CACHE & SYNC ENGINE (OPS / RESILIENCE)
// ============================================================================
exports.offlineSettings = (0, pg_core_1.pgTable)('offline_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .unique()
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }), // Nullable for global tenant policy
    allowOfflineSales: (0, pg_core_1.boolean)('allow_offline_sales').default(true).notNull(),
    maxOfflineHours: (0, pg_core_1.integer)('max_offline_hours').default(72).notNull(), // Maximum disconnected operational window
    maxOfflineTicketTotal: (0, pg_core_1.numeric)('max_offline_ticket_total', { precision: 12, scale: 2 }).default('50000.00').notNull(),
    maxOfflineCumulativeBalance: (0, pg_core_1.numeric)('max_offline_cumulative_balance', { precision: 14, scale: 2 }).default('500000.00').notNull(),
    requireManagerAuthForOffline: (0, pg_core_1.boolean)('require_manager_auth_for_offline').default(false).notNull(),
    conflictResolutionStrategy: (0, pg_core_1.varchar)('conflict_resolution_strategy', { length: 50 }).default('SERVER_TIMESTAMP_WINS').notNull(), // SERVER_TIMESTAMP_WINS | CLIENT_TIMESTAMP_WINS | MANUAL_REVIEW
    autoSyncOnReconnect: (0, pg_core_1.boolean)('auto_sync_on_reconnect').default(true).notNull(),
    syncBatchSize: (0, pg_core_1.integer)('sync_batch_size').default(50).notNull(), // Number of orders batched per sync dispatch
    syncIntervalSeconds: (0, pg_core_1.integer)('sync_interval_seconds').default(30).notNull(),
    // Cache & Local Storage Policies
    cacheCatalogItems: (0, pg_core_1.boolean)('cache_catalog_items').default(true).notNull(),
    cacheCustomerDirectory: (0, pg_core_1.boolean)('cache_customer_directory').default(true).notNull(),
    cacheTaxTables: (0, pg_core_1.boolean)('cache_tax_tables').default(true).notNull(),
    cacheUserCredentials: (0, pg_core_1.boolean)('cache_user_credentials').default(true).notNull(), // Offline PIN authentication
    encryptLocalStorage: (0, pg_core_1.boolean)('encrypt_local_storage').default(true).notNull(),
    // Tender Restrictions when Offline
    allowOfflineCash: (0, pg_core_1.boolean)('allow_offline_cash').default(true).notNull(),
    allowOfflineCard: (0, pg_core_1.boolean)('allow_offline_card').default(true).notNull(), // Store-and-forward card vouchers
    allowOfflineMpesaReference: (0, pg_core_1.boolean)('allow_offline_mpesa_reference').default(true).notNull(), // Manual code entry pending background IPN validation
    allowOfflineGiftCards: (0, pg_core_1.boolean)('allow_offline_gift_cards').default(false).notNull(),
    allowOfflineCreditTabs: (0, pg_core_1.boolean)('allow_offline_credit_tabs').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('offline_settings_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('offline_settings_branch_idx').on(t.branchId),
]);
exports.offlineSyncBatches = (0, pg_core_1.pgTable)('offline_sync_batches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'cascade' }),
    terminalIdentifier: (0, pg_core_1.varchar)('terminal_identifier', { length: 100 }).notNull(),
    batchReference: (0, pg_core_1.varchar)('batch_reference', { length: 100 }).notNull(),
    recordCount: (0, pg_core_1.integer)('record_count').default(0).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('PROCESSED').notNull(), // PENDING | PROCESSED | CONFLICT_DETECTED | FAILED
    conflictCount: (0, pg_core_1.integer)('conflict_count').default(0).notNull(),
    payloadSummary: (0, pg_core_1.jsonb)('payload_summary'),
    syncDurationMs: (0, pg_core_1.integer)('sync_duration_ms').default(0).notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('offline_sync_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('offline_sync_terminal_idx').on(t.terminalIdentifier),
    (0, pg_core_1.index)('offline_sync_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// DEVICE TRUST, TERMINAL REGISTRATION & HARDWARE FLEET (MDM / OPS)
// ============================================================================
exports.posDevices = (0, pg_core_1.pgTable)('pos_devices', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 120 }).notNull(), // e.g. "Terminal 01 - Main Counter", "Expediter Screen 01"
    deviceCode: (0, pg_core_1.varchar)('device_code', { length: 50 }).notNull(), // Unique terminal code e.g. "POS-TERM-001"
    deviceType: (0, pg_core_1.varchar)('device_type', { length: 50 }).default('POS_TERMINAL').notNull(), // POS_TERMINAL | KDS_DISPLAY | WAITER_TABLET | SELF_ORDER_KIOSK | BARCODE_SCANNER | MANAGER_STATION
    operatingSystem: (0, pg_core_1.varchar)('operating_system', { length: 50 }).default('WEB_BROWSER').notNull(), // ANDROID | IOS | WINDOWS | LINUX | WEB_BROWSER
    hardwareFingerprint: (0, pg_core_1.varchar)('hardware_fingerprint', { length: 255 }), // SHA-256 client fingerprint
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 64 }),
    macAddress: (0, pg_core_1.varchar)('mac_address', { length: 64 }),
    appVersion: (0, pg_core_1.varchar)('app_version', { length: 30 }),
    // Station & Peripherals Association
    assignedDrawerId: (0, pg_core_1.integer)('assigned_drawer_id').references(() => exports.cashDrawers.id, { onDelete: 'set null' }),
    assignedKitchenStationId: (0, pg_core_1.integer)('assigned_kitchen_station_id').references(() => exports.kitchenStations.id, { onDelete: 'set null' }),
    assignedReceiptPrinterId: (0, pg_core_1.integer)('assigned_receipt_printer_id').references(() => exports.networkPrinters.id, { onDelete: 'set null' }),
    // Security & Lifecycle
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(), // PENDING_APPROVAL | ACTIVE | SUSPENDED | DECOMMISSIONED
    isLocked: (0, pg_core_1.boolean)('is_locked').default(false).notNull(),
    allowOfflineSales: (0, pg_core_1.boolean)('allow_offline_sales').default(true).notNull(),
    lastHeartbeatAt: (0, pg_core_1.timestamp)('last_heartbeat_at', { withTimezone: true }),
    lastHeartbeatIp: (0, pg_core_1.varchar)('last_heartbeat_ip', { length: 64 }),
    registeredByUserId: (0, pg_core_1.integer)('registered_by_user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    decommissionedAt: (0, pg_core_1.timestamp)('decommissioned_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('pos_devices_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('pos_devices_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('pos_devices_code_idx').on(t.tenantId, t.deviceCode),
    (0, pg_core_1.index)('pos_devices_status_idx').on(t.tenantId, t.status),
]);
exports.deviceEnrollmentTokens = (0, pg_core_1.pgTable)('device_enrollment_tokens', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id')
        .references(() => exports.branches.id, { onDelete: 'cascade' })
        .notNull(),
    pairingCode: (0, pg_core_1.varchar)('pairing_code', { length: 12 }).notNull(), // 6-digit or formatted pairing pin e.g. "749-218"
    token: (0, pg_core_1.text)('token').notNull(), // Cryptographic one-time enrollment token
    deviceType: (0, pg_core_1.varchar)('device_type', { length: 50 }).default('POS_TERMINAL').notNull(),
    assignedDrawerId: (0, pg_core_1.integer)('assigned_drawer_id').references(() => exports.cashDrawers.id, { onDelete: 'set null' }),
    assignedKitchenStationId: (0, pg_core_1.integer)('assigned_kitchen_station_id').references(() => exports.kitchenStations.id, { onDelete: 'set null' }),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    isClaimed: (0, pg_core_1.boolean)('is_claimed').default(false).notNull(),
    claimedDeviceId: (0, pg_core_1.integer)('claimed_device_id').references(() => exports.posDevices.id, { onDelete: 'set null' }),
    createdByUserId: (0, pg_core_1.integer)('created_by_user_id').references(() => exports.users.id, { onDelete: 'set null' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('device_enrollment_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('device_enrollment_pairing_idx').on(t.tenantId, t.pairingCode),
]);
// ============================================================================
// ENTERPRISE SUBSCRIPTIONS, SEAT LICENSING & BILLING LEDGER (FIN / BILLING)
// ============================================================================
exports.subscriptionPlans = (0, pg_core_1.pgTable)('subscription_plans', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).unique().notNull(), // e.g. "STARTER", "PROFESSIONAL", "ENTERPRISE"
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    billingCycle: (0, pg_core_1.varchar)('billing_cycle', { length: 20 }).default('MONTHLY').notNull(), // MONTHLY | ANNUALLY
    basePrice: (0, pg_core_1.numeric)('base_price', { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('KES').notNull(),
    includedUsers: (0, pg_core_1.integer)('included_users').default(5).notNull(),
    includedBranches: (0, pg_core_1.integer)('included_branches').default(1).notNull(),
    perUserPrice: (0, pg_core_1.numeric)('per_user_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    perBranchPrice: (0, pg_core_1.numeric)('per_branch_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    features: (0, pg_core_1.jsonb)('features').$type().default([]).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('subscription_plans_code_idx').on(t.code),
    (0, pg_core_1.index)('subscription_plans_active_idx').on(t.isActive),
]);
exports.billingPaymentMethods = (0, pg_core_1.pgTable)('billing_payment_methods', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 30 }).notNull(), // CARD | MPESA_STANDING_ORDER | DIRECT_DEBIT | CORPORATE_INVOICE
    provider: (0, pg_core_1.varchar)('provider', { length: 50 }).notNull(), // STRIPE | MPESA | DPO | PESAPAL | BANK_DIRECT
    accountMask: (0, pg_core_1.varchar)('account_mask', { length: 50 }).notNull(), // e.g. "•••• 4242" or "2547••••123"
    brandOrBank: (0, pg_core_1.varchar)('brand_or_bank', { length: 50 }), // VISA, MASTERCARD, SAFARICOM, KCB, EQUITY
    expiryMonth: (0, pg_core_1.integer)('expiry_month'),
    expiryYear: (0, pg_core_1.integer)('expiry_year'),
    token: (0, pg_core_1.text)('token').notNull(), // Tokenized payment mandate / token reference
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('billing_payment_methods_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('billing_payment_methods_default_idx').on(t.tenantId, t.isDefault),
]);
exports.tenantSubscriptions = (0, pg_core_1.pgTable)('tenant_subscriptions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .unique()
        .notNull(),
    planId: (0, pg_core_1.integer)('plan_id')
        .references(() => exports.subscriptionPlans.id, { onDelete: 'restrict' })
        .notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('TRIAL').notNull(), // TRIAL | ACTIVE | PAST_DUE | CANCELLED | SUSPENDED
    currentPeriodStart: (0, pg_core_1.timestamp)('current_period_start', { withTimezone: true }).defaultNow().notNull(),
    currentPeriodEnd: (0, pg_core_1.timestamp)('current_period_end', { withTimezone: true }).notNull(),
    seatAllocation: (0, pg_core_1.integer)('seat_allocation').default(5).notNull(),
    branchAllocation: (0, pg_core_1.integer)('branch_allocation').default(1).notNull(),
    paymentMethodId: (0, pg_core_1.integer)('payment_method_id')
        .references(() => exports.billingPaymentMethods.id, { onDelete: 'set null' }),
    autoRenew: (0, pg_core_1.boolean)('auto_renew').default(true).notNull(),
    cancelAtPeriodEnd: (0, pg_core_1.boolean)('cancel_at_period_end').default(false).notNull(),
    canceledAt: (0, pg_core_1.timestamp)('canceled_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('tenant_subscriptions_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('tenant_subscriptions_status_idx').on(t.status),
]);
exports.billingInvoices = (0, pg_core_1.pgTable)('billing_invoices', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    subscriptionId: (0, pg_core_1.integer)('subscription_id')
        .references(() => exports.tenantSubscriptions.id, { onDelete: 'set null' }),
    invoiceNumber: (0, pg_core_1.varchar)('invoice_number', { length: 100 }).unique().notNull(), // e.g. "INV-2026-00128"
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxRate: (0, pg_core_1.numeric)('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(), // KRA VAT 16%
    taxAmount: (0, pg_core_1.numeric)('tax_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: (0, pg_core_1.numeric)('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('KES').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('PENDING').notNull(), // DRAFT | PENDING | PAID | OVERDUE | VOID
    billingPeriodStart: (0, pg_core_1.timestamp)('billing_period_start', { withTimezone: true }).notNull(),
    billingPeriodEnd: (0, pg_core_1.timestamp)('billing_period_end', { withTimezone: true }).notNull(),
    dueDate: (0, pg_core_1.timestamp)('due_date', { withTimezone: true }).notNull(),
    paidAt: (0, pg_core_1.timestamp)('paid_at', { withTimezone: true }),
    paymentMethodType: (0, pg_core_1.varchar)('payment_method_type', { length: 50 }),
    externalTransactionRef: (0, pg_core_1.varchar)('external_transaction_ref', { length: 150 }),
    pdfUrl: (0, pg_core_1.text)('pdf_url'),
    lineItems: (0, pg_core_1.jsonb)('line_items')
        .$type()
        .default([])
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('billing_invoices_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('billing_invoices_number_idx').on(t.invoiceNumber),
    (0, pg_core_1.index)('billing_invoices_status_idx').on(t.tenantId, t.status),
]);
// ============================================================================
// ENTERPRISE SECURITY, IDENTITY GOVERNANCE & ACTIVE SESSIONS (SEC / AUTH)
// ============================================================================
exports.securitySettings = (0, pg_core_1.pgTable)('security_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .unique()
        .notNull(),
    // Password Policies
    minPasswordLength: (0, pg_core_1.integer)('min_password_length').default(10).notNull(),
    requireUppercase: (0, pg_core_1.boolean)('require_uppercase').default(true).notNull(),
    requireLowercase: (0, pg_core_1.boolean)('require_lowercase').default(true).notNull(),
    requireNumbers: (0, pg_core_1.boolean)('require_numbers').default(true).notNull(),
    requireSymbols: (0, pg_core_1.boolean)('require_symbols').default(true).notNull(),
    passwordExpirationDays: (0, pg_core_1.integer)('password_expiration_days').default(90).notNull(), // 0 = never
    preventPasswordReuseCount: (0, pg_core_1.integer)('prevent_password_reuse_count').default(5).notNull(),
    // Multi-Factor Authentication (MFA)
    mfaEnforcement: (0, pg_core_1.varchar)('mfa_enforcement', { length: 40 }).default('OPTIONAL').notNull(), // OPTIONAL | ENFORCED_FOR_ADMINS | ENFORCED_FOR_ALL
    allowedMfaMethods: (0, pg_core_1.jsonb)('allowed_mfa_methods')
        .$type()
        .default(['TOTP', 'EMAIL'])
        .notNull(),
    // Session Inactivity & Concurrency Controls
    sessionTimeoutMinutes: (0, pg_core_1.integer)('session_timeout_minutes').default(30).notNull(), // Inactivity auto-lockout
    maxConcurrentSessions: (0, pg_core_1.integer)('max_concurrent_sessions').default(3).notNull(), // 0 = unlimited
    enforceIpBinding: (0, pg_core_1.boolean)('enforce_ip_binding').default(false).notNull(),
    notifyOnNewLogin: (0, pg_core_1.boolean)('notify_on_new_login').default(true).notNull(),
    // Brute-Force & Lockout Controls
    maxFailedAttempts: (0, pg_core_1.integer)('max_failed_attempts').default(5).notNull(),
    lockoutDurationMinutes: (0, pg_core_1.integer)('lockout_duration_minutes').default(30).notNull(),
    // Network Perimeter & IP Access Restricting
    enableIpAllowlist: (0, pg_core_1.boolean)('enable_ip_allowlist').default(false).notNull(),
    allowedIpRanges: (0, pg_core_1.jsonb)('allowed_ip_ranges')
        .$type()
        .default([])
        .notNull(), // e.g. ["192.168.1.0/24", "41.89.20.15"]
    // Single Sign-On (SSO) Status
    ssoEnabled: (0, pg_core_1.boolean)('sso_enabled').default(false).notNull(),
    ssoProvider: (0, pg_core_1.varchar)('sso_provider', { length: 50 }), // GOOGLE_WORKSPACE | MICROSOFT_AZURE | OKTA_SAML
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('security_settings_tenant_idx').on(t.tenantId),
]);
exports.userSessions = (0, pg_core_1.pgTable)('user_sessions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    sessionTokenHash: (0, pg_core_1.varchar)('session_token_hash', { length: 255 }).notNull(),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 64 }).notNull(),
    userAgent: (0, pg_core_1.text)('user_agent'),
    deviceType: (0, pg_core_1.varchar)('device_type', { length: 50 }).default('DESKTOP').notNull(), // DESKTOP | MOBILE | TABLET | POS_TERMINAL
    browser: (0, pg_core_1.varchar)('browser', { length: 50 }),
    os: (0, pg_core_1.varchar)('os', { length: 50 }),
    city: (0, pg_core_1.varchar)('city', { length: 100 }),
    country: (0, pg_core_1.varchar)('country', { length: 100 }),
    isRevoked: (0, pg_core_1.boolean)('is_revoked').default(false).notNull(),
    lastActiveAt: (0, pg_core_1.timestamp)('last_active_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('user_sessions_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('user_sessions_user_idx').on(t.userId),
    (0, pg_core_1.index)('user_sessions_active_idx').on(t.tenantId, t.isRevoked),
]);
// ============================================================================
// ENTERPRISE HELP DESK, SUPPORT TICKETING & KNOWLEDGE BASE (OPS / SUPPORT)
// ============================================================================
exports.supportTickets = (0, pg_core_1.pgTable)('support_tickets', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    ticketNumber: (0, pg_core_1.varchar)('ticket_number', { length: 50 }).unique().notNull(), // e.g. "TCK-2026-0042"
    subject: (0, pg_core_1.varchar)('subject', { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(), // HARDWARE | BILLING | POS_KDS | INVENTORY | AUTH_SECURITY | GENERAL
    priority: (0, pg_core_1.varchar)('priority', { length: 20 }).default('MEDIUM').notNull(), // LOW | MEDIUM | HIGH | CRITICAL
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('OPEN').notNull(), // OPEN | IN_PROGRESS | WAITING_FOR_USER | RESOLVED | CLOSED
    description: (0, pg_core_1.text)('description').notNull(),
    diagnosticsPayload: (0, pg_core_1.jsonb)('diagnostics_payload').$type(),
    assignedAgent: (0, pg_core_1.varchar)('assigned_agent', { length: 100 }),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('support_tickets_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('support_tickets_status_idx').on(t.tenantId, t.status),
    (0, pg_core_1.index)('support_tickets_priority_idx').on(t.tenantId, t.priority),
]);
exports.supportTicketMessages = (0, pg_core_1.pgTable)('support_ticket_messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    ticketId: (0, pg_core_1.integer)('ticket_id')
        .references(() => exports.supportTickets.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    isStaffReply: (0, pg_core_1.boolean)('is_staff_reply').default(false).notNull(), // true if enterprise support specialist
    senderName: (0, pg_core_1.varchar)('sender_name', { length: 120 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    attachments: (0, pg_core_1.jsonb)('attachments').$type().default([]).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('support_ticket_messages_ticket_idx').on(t.ticketId),
]);
exports.knowledgeBaseArticles = (0, pg_core_1.pgTable)('knowledge_base_articles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' }), // Nullable for global documentation
    slug: (0, pg_core_1.varchar)('slug', { length: 150 }).unique().notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(), // GETTING_STARTED | POS_TERMINALS | KITCHEN_ROUTING | FISCAL_ETIMS | BILLING
    summary: (0, pg_core_1.text)('summary').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    readTimeMinutes: (0, pg_core_1.integer)('read_time_minutes').default(3).notNull(),
    isPublished: (0, pg_core_1.boolean)('is_published').default(true).notNull(),
    viewCount: (0, pg_core_1.integer)('view_count').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('kb_articles_category_idx').on(t.category),
    (0, pg_core_1.index)('kb_articles_published_idx').on(t.isPublished),
]);
// ============================================================================
// ENTERPRISE REPORTING, SUITEANALYTICS & SCHEDULED JOBS (ANALYTICS / AUDIT)
// ============================================================================
exports.reportDefinitions = (0, pg_core_1.pgTable)('report_definitions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' }), // Nullable for system-wide standard reports
    code: (0, pg_core_1.varchar)('code', { length: 80 }).unique().notNull(), // e.g. "HCM_HEADCOUNT_ATTENDANCE", "FIN_REVENUE_TAX_SUMMARY"
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(), // WORKFORCE_HCM | REVENUE_SALES | OPERATIONS_KDS | COMPLIANCE_AUDIT
    description: (0, pg_core_1.text)('description').notNull(),
    supportedFormats: (0, pg_core_1.jsonb)('supported_formats')
        .$type()
        .default(['CSV', 'JSON'])
        .notNull(),
    parameterSchema: (0, pg_core_1.jsonb)('parameter_schema')
        .$type()
        .default({ requiresDateRange: true, requiresBranch: false })
        .notNull(),
    isSystem: (0, pg_core_1.boolean)('is_system').default(true).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('report_definitions_category_idx').on(t.category),
    (0, pg_core_1.index)('report_definitions_active_idx').on(t.isActive),
]);
exports.reportExecutions = (0, pg_core_1.pgTable)('report_executions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    reportDefinitionId: (0, pg_core_1.integer)('report_definition_id')
        .references(() => exports.reportDefinitions.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    requestedByUserId: (0, pg_core_1.integer)('requested_by_user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    executionNumber: (0, pg_core_1.varchar)('execution_number', { length: 100 }).unique().notNull(), // e.g. "REP-2026-00492"
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('QUEUED').notNull(), // QUEUED | PROCESSING | COMPLETED | FAILED
    format: (0, pg_core_1.varchar)('format', { length: 20 }).default('CSV').notNull(), // CSV | JSON | PDF | XLSX
    parametersApplied: (0, pg_core_1.jsonb)('parameters_applied')
        .$type()
        .default({})
        .notNull(),
    rowCount: (0, pg_core_1.integer)('row_count').default(0).notNull(),
    executionDurationMs: (0, pg_core_1.integer)('execution_duration_ms').default(0).notNull(),
    fileUrl: (0, pg_core_1.text)('file_url'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    generatedAt: (0, pg_core_1.timestamp)('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('report_executions_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('report_executions_def_idx').on(t.reportDefinitionId),
    (0, pg_core_1.index)('report_executions_status_idx').on(t.tenantId, t.status),
]);
exports.reportSchedules = (0, pg_core_1.pgTable)('report_schedules', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    reportDefinitionId: (0, pg_core_1.integer)('report_definition_id')
        .references(() => exports.reportDefinitions.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    createdByUserId: (0, pg_core_1.integer)('created_by_user_id').references(() => exports.users.id, { onDelete: 'set null' }).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 150 }).notNull(),
    frequency: (0, pg_core_1.varchar)('frequency', { length: 30 }).default('WEEKLY').notNull(), // DAILY | WEEKLY | MONTHLY | END_OF_SHIFT
    deliveryChannel: (0, pg_core_1.varchar)('delivery_channel', { length: 30 }).default('EMAIL').notNull(), // EMAIL | WEBHOOK | STORAGE
    recipients: (0, pg_core_1.jsonb)('recipients')
        .$type()
        .default([])
        .notNull(), // Email addresses or webhook URLs
    format: (0, pg_core_1.varchar)('format', { length: 20 }).default('CSV').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    lastRunAt: (0, pg_core_1.timestamp)('last_run_at', { withTimezone: true }),
    nextRunAt: (0, pg_core_1.timestamp)('next_run_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('report_schedules_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('report_schedules_active_idx').on(t.isActive),
]);
// ============================================================================
// CUSTOMERS & CRM DIRECTORY (CRM / SALES)
// ============================================================================
exports.customers = (0, pg_core_1.pgTable)('customers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }).notNull(),
    kraPin: (0, pg_core_1.varchar)('kra_pin', { length: 50 }), // For B2B corporate tax invoices
    companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }),
    customerType: (0, pg_core_1.varchar)('customer_type', { length: 50 }).default('RETAIL').notNull(), // RETAIL | CORPORATE | VIP | WHOLESALE
    loyaltyPoints: (0, pg_core_1.integer)('loyalty_points').default(0).notNull(),
    totalSpent: (0, pg_core_1.decimal)('total_spent', { precision: 12, scale: 2 }).default('0.00').notNull(),
    ordersCount: (0, pg_core_1.integer)('orders_count').default(0).notNull(),
    address: (0, pg_core_1.text)('address'),
    notes: (0, pg_core_1.text)('notes'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('customers_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('customers_phone_idx').on(t.tenantId, t.phone),
    (0, pg_core_1.index)('customers_email_idx').on(t.tenantId, t.email),
    (0, pg_core_1.index)('customers_type_idx').on(t.tenantId, t.customerType),
]);
exports.customerInteractions = (0, pg_core_1.pgTable)('customer_interactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    customerId: (0, pg_core_1.integer)('customer_id')
        .references(() => exports.customers.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    interactionType: (0, pg_core_1.varchar)('interaction_type', { length: 50 }).default('NOTE').notNull(), // NOTE | CALL | EMAIL | FEEDBACK | SUPPORT_TICKET
    subject: (0, pg_core_1.varchar)('subject', { length: 255 }).notNull(),
    details: (0, pg_core_1.text)('details').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('customer_interactions_customer_idx').on(t.customerId),
    (0, pg_core_1.index)('customer_interactions_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// LOYALTY, REWARDS & MEMBER INCENTIVES (CRM / HCM ENGAGEMENT)
// ============================================================================
exports.loyaltyTiers = (0, pg_core_1.pgTable)('loyalty_tiers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // e.g., "Silver Member", "Gold VIP", "Platinum Elite"
    minPoints: (0, pg_core_1.integer)('min_points').default(0).notNull(),
    earningMultiplier: (0, pg_core_1.numeric)('earning_multiplier', { precision: 4, scale: 2 }).default('1.00').notNull(), // e.g. 1.5x points per KES spent
    perks: (0, pg_core_1.jsonb)('perks').$type().default([]).notNull(), // e.g. ["Free Priority Seating", "Complimentary Dessert", "10% Discount"]
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('loyalty_tiers_tenant_idx').on(t.tenantId),
]);
exports.customerLoyaltyProfiles = (0, pg_core_1.pgTable)('customer_loyalty_profiles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    customerId: (0, pg_core_1.integer)('customer_id')
        .references(() => exports.customers.id, { onDelete: 'cascade' })
        .unique()
        .notNull(),
    tierId: (0, pg_core_1.integer)('tier_id')
        .references(() => exports.loyaltyTiers.id, { onDelete: 'set null' }),
    currentPoints: (0, pg_core_1.integer)('current_points').default(0).notNull(),
    lifetimePointsEarned: (0, pg_core_1.integer)('lifetime_points_earned').default(0).notNull(),
    lifetimePointsRedeemed: (0, pg_core_1.integer)('lifetime_points_redeemed').default(0).notNull(),
    enrolledAt: (0, pg_core_1.timestamp)('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('cust_loyalty_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('cust_loyalty_customer_idx').on(t.customerId),
]);
exports.loyaltyPointTransactions = (0, pg_core_1.pgTable)('loyalty_point_transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    customerId: (0, pg_core_1.integer)('customer_id')
        .references(() => exports.customers.id, { onDelete: 'cascade' })
        .notNull(),
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    transactionType: (0, pg_core_1.varchar)('transaction_type', { length: 40 }).notNull(), // 'EARN_PURCHASE', 'REDEEM_REWARD', 'MANUAL_ADJUSTMENT', 'TIER_BONUS'
    points: (0, pg_core_1.integer)('points').notNull(), // Positive = Earn, Negative = Redeem
    balanceAfter: (0, pg_core_1.integer)('balance_after').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    processedById: (0, pg_core_1.integer)('processed_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('loyalty_tx_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('loyalty_tx_customer_idx').on(t.customerId),
    (0, pg_core_1.index)('loyalty_tx_created_idx').on(t.tenantId, t.createdAt),
]);
exports.loyaltyRewardsCatalog = (0, pg_core_1.pgTable)('loyalty_rewards_catalog', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    pointsCost: (0, pg_core_1.integer)('points_cost').notNull(),
    rewardType: (0, pg_core_1.varchar)('reward_type', { length: 50 }).default('DISCOUNT_FIXED').notNull(), // 'DISCOUNT_FIXED', 'PERCENTAGE_OFF', 'FREE_MENU_ITEM', 'EXPERIENCE_PERK'
    rewardValue: (0, pg_core_1.decimal)('reward_value', { precision: 12, scale: 2 }).default('0.00').notNull(),
    maxDiscountCap: (0, pg_core_1.decimal)('max_discount_cap', { precision: 12, scale: 2 }), // Cap for percentage discounts
    menuItemId: (0, pg_core_1.integer)('menu_item_id').references(() => exports.menuItems.id, { onDelete: 'set null' }),
    minTierId: (0, pg_core_1.integer)('min_tier_id').references(() => exports.loyaltyTiers.id, { onDelete: 'set null' }), // Tier clearance requirement
    maxRedemptionsPerMember: (0, pg_core_1.integer)('max_redemptions_per_member'),
    totalInventoryQuota: (0, pg_core_1.integer)('total_inventory_quota'),
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }),
    endDate: (0, pg_core_1.timestamp)('end_date', { withTimezone: true }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('loyalty_rewards_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('loyalty_rewards_active_idx').on(t.tenantId, t.isActive),
    (0, pg_core_1.index)('loyalty_rewards_tier_idx').on(t.minTierId),
]);
// ============================================================================
// LOYALTY LEDGER & TRANSACTION AUDIT (CRM / AUDIT)
// ============================================================================
exports.loyaltyTransactionsLedger = (0, pg_core_1.pgTable)('loyalty_transactions_ledger', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    customerId: (0, pg_core_1.integer)('customer_id')
        .references(() => exports.customers.id, { onDelete: 'cascade' })
        .notNull(),
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    rewardId: (0, pg_core_1.integer)('reward_id').references(() => exports.loyaltyRewardsCatalog.id, { onDelete: 'set null' }),
    // Transaction Classification & Financial Value
    entryType: (0, pg_core_1.varchar)('entry_type', { length: 50 }).notNull(), // 'ACCRUAL_PURCHASE', 'REDEMPTION_VOUCHER', 'MANUAL_ADJUSTMENT', 'EXPIRY_DEDUCTION', 'TIER_BONUS'
    pointsDelta: (0, pg_core_1.integer)('points_delta').notNull(), // Positive for earnings, Negative for burn/redemptions
    monetaryValueKes: (0, pg_core_1.decimal)('monetary_value_kes', { precision: 12, scale: 2 }).default('0.00').notNull(), // Equivalent spend or discount value
    balanceBefore: (0, pg_core_1.integer)('balance_before').notNull(),
    balanceAfter: (0, pg_core_1.integer)('balance_after').notNull(),
    channel: (0, pg_core_1.varchar)('channel', { length: 30 }).default('POS_TERMINAL').notNull(), // 'POS_TERMINAL', 'WEB_PORTAL', 'MOBILE_APP', 'ADMIN_BACKOFFICE'
    auditReference: (0, pg_core_1.varchar)('audit_reference', { length: 100 }), // e.g. "TRX-LOY-2026-0091"
    notes: (0, pg_core_1.text)('notes'),
    processedById: (0, pg_core_1.integer)('processed_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('loyalty_ledger_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('loyalty_ledger_customer_idx').on(t.customerId),
    (0, pg_core_1.index)('loyalty_ledger_type_idx').on(t.tenantId, t.entryType),
    (0, pg_core_1.index)('loyalty_ledger_created_idx').on(t.tenantId, t.createdAt),
]);
// ============================================================================
// CUSTOMER FEEDBACK, CSAT & VOICE AUDIT (CRM / SERVICE EXCELLENCE)
// ============================================================================
exports.customerFeedback = (0, pg_core_1.pgTable)('customer_feedback', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    customerId: (0, pg_core_1.integer)('customer_id')
        .references(() => exports.customers.id, { onDelete: 'cascade' })
        .notNull(),
    orderId: (0, pg_core_1.integer)('order_id').references(() => exports.orders.id, { onDelete: 'set null' }),
    staffId: (0, pg_core_1.integer)('staff_id').references(() => exports.users.id, { onDelete: 'set null' }), // Attributed server/cashier
    // Metrics & Classification
    feedbackCategory: (0, pg_core_1.varchar)('feedback_category', { length: 50 }).notNull(), // 'FOOD_QUALITY', 'SERVICE_SPEED', 'CLEANLINESS', 'ORDER_ACCURACY', 'STAFF_COURTESY', 'VALUE_PRICE'
    rating: (0, pg_core_1.integer)('rating').notNull(), // 1 to 5 Stars
    npsScore: (0, pg_core_1.integer)('nps_score'), // 0 to 10 (Net Promoter Score)
    sentiment: (0, pg_core_1.varchar)('sentiment', { length: 20 }).default('NEUTRAL').notNull(), // 'POSITIVE', 'NEUTRAL', 'NEGATIVE'
    // Status & Closed-Loop SLA
    channel: (0, pg_core_1.varchar)('channel', { length: 30 }).default('TABLE_QR').notNull(), // 'TABLE_QR', 'POS_TERMINAL', 'ONLINE_RECEIPT', 'DIRECT_INQUIRY', 'MANAGER_INTERVIEW'
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('NEW').notNull(), // 'NEW', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED_DISMISSED'
    title: (0, pg_core_1.varchar)('title', { length: 200 }).notNull(),
    comments: (0, pg_core_1.text)('comments').notNull(),
    // Escalation & Resolution Audit
    actionTaken: (0, pg_core_1.text)('action_taken'),
    assignedToUserId: (0, pg_core_1.integer)('assigned_to_user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('feedback_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('feedback_customer_idx').on(t.customerId),
    (0, pg_core_1.index)('feedback_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('feedback_status_idx').on(t.tenantId, t.status),
    (0, pg_core_1.index)('feedback_rating_idx').on(t.tenantId, t.rating),
]);
// ============================================================================
// MARKETING CAMPAIGNS & AUDIENCE ENGAGEMENT
// ============================================================================
exports.marketingCampaigns = (0, pg_core_1.pgTable)('marketing_campaigns', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(), // e.g., 'CMP-WEEKEND-BRUNCH'
    objective: (0, pg_core_1.varchar)('objective', { length: 100 }).default('REVENUE_GROWTH').notNull(), // 'REVENUE_GROWTH', 'CUSTOMER_RETENTION', 'LOYALTY_ACCRUAL', 'BRAND_AWARENESS'
    channel: (0, pg_core_1.varchar)('channel', { length: 50 }).default('SMS').notNull(), // 'SMS', 'EMAIL', 'PUSH_NOTIFICATION', 'OMNICHANNEL'
    targetSegment: (0, pg_core_1.varchar)('target_segment', { length: 100 }).default('ALL_CUSTOMERS').notNull(), // 'ALL_CUSTOMERS', 'VIP_MEMBERS', 'LAPSED_CUSTOMERS', 'HIGH_SPENDERS', 'CORPORATE'
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('DRAFT').notNull(), // 'DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'PAUSED'
    // Financials & Offer Payload
    budgetKes: (0, pg_core_1.decimal)('budget_kes', { precision: 12, scale: 2 }).default('0.00').notNull(),
    attributedRevenueKes: (0, pg_core_1.decimal)('attributed_revenue_kes', { precision: 12, scale: 2 }).default('0.00').notNull(),
    promoCode: (0, pg_core_1.varchar)('promo_code', { length: 50 }),
    discountPercentage: (0, pg_core_1.integer)('discount_percentage'),
    messageContent: (0, pg_core_1.text)('message_content').notNull(),
    // Performance Funnel Telemetry
    recipientsCount: (0, pg_core_1.integer)('recipients_count').default(0).notNull(),
    deliveredCount: (0, pg_core_1.integer)('delivered_count').default(0).notNull(),
    clickedCount: (0, pg_core_1.integer)('clicked_count').default(0).notNull(),
    convertedCount: (0, pg_core_1.integer)('converted_count').default(0).notNull(),
    // Schedule Timeline
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }),
    endDate: (0, pg_core_1.timestamp)('end_date', { withTimezone: true }),
    createdById: (0, pg_core_1.integer)('created_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('campaigns_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('campaigns_status_idx').on(t.tenantId, t.status),
    (0, pg_core_1.index)('campaigns_channel_idx').on(t.tenantId, t.channel),
]);
exports.campaignRecipientsLog = (0, pg_core_1.pgTable)('campaign_recipients_log', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    campaignId: (0, pg_core_1.integer)('campaign_id')
        .references(() => exports.marketingCampaigns.id, { onDelete: 'cascade' })
        .notNull(),
    customerId: (0, pg_core_1.integer)('customer_id')
        .references(() => exports.customers.id, { onDelete: 'cascade' })
        .notNull(),
    deliveryStatus: (0, pg_core_1.varchar)('delivery_status', { length: 50 }).default('SENT').notNull(), // 'SENT', 'DELIVERED', 'FAILED', 'CLICKED', 'CONVERTED'
    sentAt: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('campaign_recipients_campaign_idx').on(t.campaignId),
    (0, pg_core_1.index)('campaign_recipients_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// MARKETING TEMPLATES & REUSABLE MERGE-TAG COPIES
// ============================================================================
exports.marketingTemplates = (0, pg_core_1.pgTable)('marketing_templates', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(), // e.g., "Weekend Dining Reactivation", "VIP Birthday Milestone"
    channel: (0, pg_core_1.varchar)('channel', { length: 50 }).default('SMS').notNull(), // 'SMS', 'EMAIL', 'PUSH_NOTIFICATION'
    objective: (0, pg_core_1.varchar)('objective', { length: 100 }).default('REVENUE_GROWTH').notNull(),
    subjectLine: (0, pg_core_1.varchar)('subject_line', { length: 255 }), // Used for Email
    bodyTemplate: (0, pg_core_1.text)('body_template').notNull(), // Contains merge tags: {{customer.firstName}}, {{promo.code}}, {{promo.discountPercent}}
    suggestedPromoPrefix: (0, pg_core_1.varchar)('suggested_promo_prefix', { length: 20 }),
    defaultDiscountPercentage: (0, pg_core_1.integer)('default_discount_percentage'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('mkt_templates_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('mkt_templates_channel_idx').on(t.tenantId, t.channel),
]);
// ============================================================================
// UNIQUE DYNAMIC PROMO CODES & POINT-OF-SALE DISCOUNTS
// ============================================================================
exports.promotionalDiscounts = (0, pg_core_1.pgTable)('promotional_discounts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    campaignId: (0, pg_core_1.integer)('campaign_id').references(() => exports.marketingCampaigns.id, { onDelete: 'set null' }),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(),
    discountType: (0, pg_core_1.varchar)('discount_type', { length: 50 }).default('PERCENTAGE').notNull(), // 'PERCENTAGE', 'FIXED_AMOUNT'
    discountValue: (0, pg_core_1.decimal)('discount_value', { precision: 12, scale: 2 }).notNull(),
    minOrderSubtotalKes: (0, pg_core_1.decimal)('min_order_subtotal_kes', { precision: 12, scale: 2 }).default('0.00').notNull(),
    maxDiscountCapKes: (0, pg_core_1.decimal)('max_discount_cap_kes', { precision: 12, scale: 2 }),
    maxUsageCount: (0, pg_core_1.integer)('max_usage_count').default(100).notNull(),
    currentUsageCount: (0, pg_core_1.integer)('current_usage_count').default(0).notNull(),
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('promo_discounts_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('promo_discounts_code_idx').on(t.tenantId, t.code),
    (0, pg_core_1.index)('promo_discounts_active_idx').on(t.tenantId, t.isActive),
]);
// ============================================================================
// SERVORA COPILOT & AI AGENT CONVERSATIONS (ENTERPRISE HCM / ERP AI)
// ============================================================================
exports.aiAssistantSessions = (0, pg_core_1.pgTable)('ai_assistant_sessions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id, { onDelete: 'cascade' })
        .notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).default('New Strategic Inquiry').notNull(),
    scopeDomain: (0, pg_core_1.varchar)('scope_domain', { length: 50 }).default('GENERAL_OPS').notNull(), // 'GENERAL_OPS', 'WORKFORCE_HCM', 'INVENTORY_SUPPLY', 'FINANCE_TREASURY', 'GUEST_CRM'
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('ai_sessions_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('ai_sessions_user_idx').on(t.tenantId, t.userId),
]);
exports.aiAssistantMessages = (0, pg_core_1.pgTable)('ai_assistant_messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    sessionId: (0, pg_core_1.integer)('session_id')
        .references(() => exports.aiAssistantSessions.id, { onDelete: 'cascade' })
        .notNull(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    senderRole: (0, pg_core_1.varchar)('sender_role', { length: 20 }).notNull(), // 'USER', 'ASSISTANT', 'SYSTEM_TELEMETRY'
    content: (0, pg_core_1.text)('content').notNull(),
    // Governed Agentic Payload
    toolCallIntent: (0, pg_core_1.varchar)('tool_call_intent', { length: 80 }), // e.g. 'ANALYZE_LABOR_EFFICIENCY', 'PREDICT_STOCK_RUNOUT', 'GENERATE_RETENTION_CAMPAIGN'
    structuredData: (0, pg_core_1.jsonb)('structured_data').$type(),
    suggestedActions: (0, pg_core_1.jsonb)('suggested_actions').$type(),
    confidenceScore: (0, pg_core_1.decimal)('confidence_score', { precision: 4, scale: 2 }), // e.g. 0.96
    tokensUsed: (0, pg_core_1.integer)('tokens_used').default(0),
    latencyMs: (0, pg_core_1.integer)('latency_ms').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('ai_messages_session_idx').on(t.sessionId),
    (0, pg_core_1.index)('ai_messages_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// DEMAND FORECASTING & WORKFORCE CAPACITY PLANNING (HCM / PREDICTIVE WFM)
// ============================================================================
exports.demandForecastSnapshots = (0, pg_core_1.pgTable)('demand_forecast_snapshots', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    forecastDate: (0, pg_core_1.timestamp)('forecast_date', { withTimezone: true }).notNull(),
    dayOfWeek: (0, pg_core_1.varchar)('day_of_week', { length: 20 }).notNull(), // 'MONDAY', 'TUESDAY', etc.
    // Core Projected Demand Drivers
    projectedCovers: (0, pg_core_1.integer)('projected_covers').notNull(),
    projectedGrossSalesKes: (0, pg_core_1.decimal)('projected_gross_sales_kes', { precision: 12, scale: 2 }).notNull(),
    historicalActualSalesKes: (0, pg_core_1.decimal)('historical_actual_sales_kes', { precision: 12, scale: 2 }),
    // Workforce & Capacity Requirements
    recommendedFohLaborHours: (0, pg_core_1.numeric)('recommended_foh_labor_hours', { precision: 6, scale: 2 }).notNull(),
    recommendedBohLaborHours: (0, pg_core_1.numeric)('recommended_boh_labor_hours', { precision: 6, scale: 2 }).notNull(),
    scheduledLaborHours: (0, pg_core_1.numeric)('scheduled_labor_hours', { precision: 6, scale: 2 }).default('0.00').notNull(),
    optimalStaffingHeadcount: (0, pg_core_1.integer)('optimal_staffing_headcount').notNull(),
    laborCostBudgetKes: (0, pg_core_1.decimal)('labor_cost_budget_kes', { precision: 12, scale: 2 }).notNull(),
    // Statistical Accuracy & Event Weighting
    confidenceScore: (0, pg_core_1.decimal)('confidence_score', { precision: 4, scale: 2 }).default('0.92').notNull(), // e.g. 0.94 (94%)
    weatherFactor: (0, pg_core_1.varchar)('weather_factor', { length: 50 }).default('CLEAR_NORMAL').notNull(), // 'CLEAR_NORMAL', 'RAIN_HEAVY', 'HEATWAVE', 'COLD_SNAP'
    localEventModifier: (0, pg_core_1.varchar)('local_event_modifier', { length: 150 }), // e.g., 'Payday Weekend', 'Public Holiday', 'Soccer Derby'
    varianceTolerancePct: (0, pg_core_1.numeric)('variance_tolerance_pct', { precision: 5, scale: 2 }).default('5.00').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('demand_forecast_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('demand_forecast_branch_idx').on(t.branchId),
    (0, pg_core_1.index)('demand_forecast_date_idx').on(t.tenantId, t.forecastDate),
]);
exports.hourlyForecastIntervals = (0, pg_core_1.pgTable)('hourly_forecast_intervals', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    snapshotId: (0, pg_core_1.integer)('snapshot_id')
        .references(() => exports.demandForecastSnapshots.id, { onDelete: 'cascade' })
        .notNull(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    hourOfDay: (0, pg_core_1.integer)('hour_of_day').notNull(), // 0 to 23
    projectedGuestCheckouts: (0, pg_core_1.integer)('projected_guest_checkouts').notNull(),
    projectedSalesKes: (0, pg_core_1.decimal)('projected_sales_kes', { precision: 12, scale: 2 }).notNull(),
    requiredServers: (0, pg_core_1.integer)('required_servers').notNull(),
    requiredLineCooks: (0, pg_core_1.integer)('required_line_cooks').notNull(),
    peakLoadIndicator: (0, pg_core_1.boolean)('peak_load_indicator').default(false).notNull(),
}, (t) => [
    (0, pg_core_1.index)('hourly_forecast_snapshot_idx').on(t.snapshotId),
    (0, pg_core_1.index)('hourly_forecast_hour_idx').on(t.snapshotId, t.hourOfDay),
]);
// ============================================================================
// PREDICTIVE PURCHASING & REPLENISHMENT INTELLIGENCE (SCM / AI AGENT)
// ============================================================================
exports.predictiveInventoryReplenishments = (0, pg_core_1.pgTable)('predictive_inventory_replenishments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    inventoryItemId: (0, pg_core_1.integer)('inventory_item_id')
        .references(() => exports.inventoryItems.id, { onDelete: 'cascade' })
        .notNull(),
    supplierId: (0, pg_core_1.integer)('supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id').references(() => exports.purchaseOrders.id, { onDelete: 'set null' }),
    // Current Telemetry & Predictive Horizon
    currentStockLevel: (0, pg_core_1.numeric)('current_stock_level', { precision: 12, scale: 2 }).notNull(),
    dailyBurnRate: (0, pg_core_1.numeric)('daily_burn_rate', { precision: 12, scale: 2 }).notNull(),
    daysOfInventoryRemaining: (0, pg_core_1.numeric)('days_of_inventory_remaining', { precision: 6, scale: 1 }).notNull(),
    forecastedRunoutDate: (0, pg_core_1.timestamp)('forecasted_runout_date', { withTimezone: true }).notNull(),
    // Restocking Recommendations & Economic Order Calculations
    recommendedOrderQty: (0, pg_core_1.numeric)('recommended_order_qty', { precision: 12, scale: 2 }).notNull(),
    unitOfMeasure: (0, pg_core_1.varchar)('unit_of_measure', { length: 30 }).default('KG').notNull(),
    estimatedUnitCostKes: (0, pg_core_1.decimal)('estimated_unit_cost_kes', { precision: 12, scale: 2 }).notNull(),
    totalProjectedCostKes: (0, pg_core_1.decimal)('total_projected_cost_kes', { precision: 12, scale: 2 }).notNull(),
    supplierLeadTimeDays: (0, pg_core_1.integer)('supplier_lead_time_days').default(3).notNull(),
    // Urgency, Risk Classification & Action Status
    urgencyLevel: (0, pg_core_1.varchar)('urgency_level', { length: 30 }).default('MEDIUM').notNull(), // 'CRITICAL', 'HIGH', 'MEDIUM', 'STABLE'
    approvalStatus: (0, pg_core_1.varchar)('approval_status', { length: 30 }).default('PENDING_REVIEW').notNull(), // 'PENDING_REVIEW', 'APPROVED_PO_CREATED', 'REJECTED_DISMISSED', 'AUTO_DISPATCHED'
    aiReasoningNote: (0, pg_core_1.text)('ai_reasoning_note').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('pred_replenish_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('pred_replenish_item_idx').on(t.inventoryItemId),
    (0, pg_core_1.index)('pred_replenish_urgency_idx').on(t.tenantId, t.urgencyLevel),
    (0, pg_core_1.index)('pred_replenish_status_idx').on(t.tenantId, t.approvalStatus),
]);
// ============================================================================
// MENU ENGINEERING MATRIX & PROFITABILITY OPTIMIZATION (AI AGENT)
// ============================================================================
exports.menuEngineeringSnapshots = (0, pg_core_1.pgTable)('menu_engineering_snapshots', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    menuItemId: (0, pg_core_1.integer)('menu_item_id')
        .references(() => exports.menuItems.id, { onDelete: 'cascade' })
        .notNull(),
    // Financial & Sales Volume Metrics
    unitsSold: (0, pg_core_1.integer)('units_sold').default(0).notNull(),
    grossRevenueKes: (0, pg_core_1.decimal)('gross_revenue_kes', { precision: 12, scale: 2 }).default('0.00').notNull(),
    unitSellingPriceKes: (0, pg_core_1.decimal)('unit_selling_price_kes', { precision: 12, scale: 2 }).notNull(),
    unitFoodCostKes: (0, pg_core_1.decimal)('unit_food_cost_kes', { precision: 12, scale: 2 }).notNull(),
    contributionMarginKes: (0, pg_core_1.decimal)('contribution_margin_kes', { precision: 12, scale: 2 }).notNull(),
    foodCostPercentage: (0, pg_core_1.numeric)('food_cost_percentage', { precision: 5, scale: 2 }).notNull(),
    // Kasavana & Smith Classification Matrix
    popularitySharePct: (0, pg_core_1.numeric)('popularity_share_pct', { precision: 5, scale: 2 }).notNull(),
    matrixClassification: (0, pg_core_1.varchar)('matrix_classification', { length: 30 }).notNull(), // 'STAR', 'PLOWHORSE', 'PUZZLE', 'DOG'
    // AI Strategic Recommendations
    suggestedPriceAdjustmentKes: (0, pg_core_1.decimal)('suggested_price_adjustment_kes', { precision: 12, scale: 2 }).default('0.00'),
    aiRecommendationType: (0, pg_core_1.varchar)('ai_recommendation_type', { length: 50 }).notNull(), // 'MAINTAIN_PRIME_SPOTLIGHT', 'REPRICE_UPWARD', 'PORTION_RE_ENGINEER', 'PROMOTIONAL_UPSELL', 'RETIRE_ITEM'
    strategicActionNote: (0, pg_core_1.text)('strategic_action_note').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('menu_eng_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('menu_eng_item_idx').on(t.menuItemId),
    (0, pg_core_1.index)('menu_eng_class_idx').on(t.tenantId, t.matrixClassification),
]);
// ============================================================================
// WORKFLOW AUTOMATION ENGINE & SYSTEM TRIGGERS (HCM / ERP ORCHESTRATION)
// ============================================================================
exports.workflowRules = (0, pg_core_1.pgTable)('workflow_rules', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    domain: (0, pg_core_1.varchar)('domain', { length: 50 }).default('WORKFORCE_HCM').notNull(),
    triggerEvent: (0, pg_core_1.varchar)('trigger_event', { length: 80 }).notNull(),
    // Evaluation Logic - support optional unit metadata
    conditionLogic: (0, pg_core_1.jsonb)('condition_logic').$type().notNull(),
    // Action Actuators
    actionType: (0, pg_core_1.varchar)('action_type', { length: 80 }).notNull(),
    actionPayload: (0, pg_core_1.jsonb)('action_payload').$type().notNull(),
    // State & Execution Telemetry
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    executionCount: (0, pg_core_1.integer)('execution_count').default(0).notNull(),
    lastTriggeredAt: (0, pg_core_1.timestamp)('last_triggered_at', { withTimezone: true }),
    createdById: (0, pg_core_1.integer)('created_by_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('wf_rules_tenant_idx').on(t.tenantId),
    (0, pg_core_1.index)('wf_rules_domain_idx').on(t.tenantId, t.domain),
    (0, pg_core_1.index)('wf_rules_active_idx').on(t.tenantId, t.isActive),
]);
exports.workflowExecutionLogs = (0, pg_core_1.pgTable)('workflow_execution_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .references(() => exports.tenants.id, { onDelete: 'cascade' })
        .notNull(),
    ruleId: (0, pg_core_1.integer)('rule_id')
        .references(() => exports.workflowRules.id, { onDelete: 'cascade' })
        .notNull(),
    executionStatus: (0, pg_core_1.varchar)('execution_status', { length: 30 }).default('SUCCESS').notNull(), // 'SUCCESS', 'FAILED', 'SKIPPED'
    triggerPayloadSnapshot: (0, pg_core_1.jsonb)('trigger_payload_snapshot').$type(),
    executionOutput: (0, pg_core_1.text)('execution_output').notNull(),
    executionDurationMs: (0, pg_core_1.integer)('execution_duration_ms').default(0).notNull(),
    executedAt: (0, pg_core_1.timestamp)('executed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('wf_logs_rule_idx').on(t.ruleId),
    (0, pg_core_1.index)('wf_logs_tenant_idx').on(t.tenantId),
]);
// ============================================================================
// ENTERPRISE EXPENSE MANAGEMENT & EMPLOYEE DISBURSEMENTS (HCM / FIN)
// ============================================================================
exports.expenseCategories = (0, pg_core_1.pgTable)('expense_categories', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(), // e.g. "TRAVEL_MILEAGE", "UTILITIES_ELECTRIC", "KITCHEN_MAINTENANCE"
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(), // e.g. "Staff Transportation & Per Diem"
    glAccountCode: (0, pg_core_1.varchar)('gl_account_code', { length: 50 }).default('6100').notNull(), // General Ledger Account Code
    requiresReceipt: (0, pg_core_1.boolean)('requires_receipt').default(true).notNull(),
    maxSingleLimit: (0, pg_core_1.decimal)('max_single_limit', { precision: 12, scale: 2 }).default('50000.00').notNull(),
    taxDeductible: (0, pg_core_1.boolean)('tax_deductible').default(true).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('exp_cat_tenant_code_idx').on(t.tenantId, t.code),
    (0, pg_core_1.index)('exp_cat_tenant_idx').on(t.tenantId),
]);
exports.expenses = (0, pg_core_1.pgTable)('expenses', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.integer)('tenant_id')
        .notNull()
        .references(() => exports.tenants.id, { onDelete: 'cascade' }),
    branchId: (0, pg_core_1.integer)('branch_id').references(() => exports.branches.id, { onDelete: 'set null' }),
    categoryId: (0, pg_core_1.integer)('category_id')
        .notNull()
        .references(() => exports.expenseCategories.id, { onDelete: 'restrict' }),
    // Expense Voucher & Metadata
    voucherNumber: (0, pg_core_1.varchar)('voucher_number', { length: 50 }).notNull(), // e.g. "EXP-2026-0001"
    expenseType: (0, pg_core_1.varchar)('expense_type', { length: 40 }).default('EMPLOYEE_REIMBURSEMENT').notNull(), // 'EMPLOYEE_REIMBURSEMENT', 'STORE_OPERATIONAL', 'PETTY_CASH_DISBURSEMENT'
    claimantId: (0, pg_core_1.integer)('claimant_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }), // Staff member claiming or logging expense
    payeeName: (0, pg_core_1.varchar)('payee_name', { length: 255 }), // Purveyor, utility provider, or employee name
    expenseDate: (0, pg_core_1.date)('expense_date').notNull(),
    // Financials & Currency
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('KES').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 2 }).notNull(),
    taxAmount: (0, pg_core_1.decimal)('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalAmount: (0, pg_core_1.decimal)('total_amount', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: (0, pg_core_1.varchar)('payment_method', { length: 50 }).default('CASH_DRAWER').notNull(), // 'CASH_DRAWER', 'MPESA_B2C', 'BANK_WIRE', 'PETTY_CASH'
    // Documentation & KRA Compliance
    merchantTaxPin: (0, pg_core_1.varchar)('merchant_tax_pin', { length: 50 }), // Supplier KRA PIN / ETR Invoice receipt number
    receiptNumber: (0, pg_core_1.varchar)('receipt_number', { length: 100 }),
    receiptAttachmentUrl: (0, pg_core_1.text)('receipt_attachment_url'),
    description: (0, pg_core_1.text)('description').notNull(),
    // Multi-Tier Enterprise Approval Workflow
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('SUBMITTED').notNull(), // 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID_DISBURSED'
    approvedByUserId: (0, pg_core_1.integer)('approved_by_user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    // Disbursement / Payment Settlement
    paidAt: (0, pg_core_1.timestamp)('paid_at', { withTimezone: true }),
    paymentReference: (0, pg_core_1.varchar)('payment_reference', { length: 100 }), // M-Pesa B2C Transaction Code or Bank Cheque / Wire Ref
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('expenses_tenant_voucher_idx').on(t.tenantId, t.voucherNumber),
    (0, pg_core_1.index)('expenses_tenant_status_idx').on(t.tenantId, t.status),
    (0, pg_core_1.index)('expenses_tenant_date_idx').on(t.tenantId, t.expenseDate),
    (0, pg_core_1.index)('expenses_claimant_idx').on(t.claimantId),
]);
