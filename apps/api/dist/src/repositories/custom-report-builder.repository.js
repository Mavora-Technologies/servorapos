"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTenantCustomReports = exports.saveCustomReport = exports.executeCustomReportQuery = exports.getAvailableSubjectAreas = exports.SUBJECT_AREA_METADATA = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
exports.SUBJECT_AREA_METADATA = {
    ORDERS_REVENUE: {
        label: 'Sales Orders & Revenue',
        description: 'Transaction totals, discounts, taxes (16% VAT + 2% Levy), settlement states, and table covers.',
        fields: [
            { key: 'orderNumber', label: 'Order Number', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'orderType', label: 'Service / Order Type', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'status', label: 'Order Status', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'paymentStatus', label: 'Payment Status', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'tableName', label: 'Table / Station', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'customerName', label: 'Customer Name', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'customerPhone', label: 'Customer Phone', dataType: 'STRING', allowedAggregations: ['NONE'] },
            { key: 'subtotal', label: 'Subtotal Amount (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'discountTotal', label: 'Discount Total (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'tax', label: 'VAT Tax (16%)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'cateringLevy', label: 'Catering Levy (2%)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'serviceCharge', label: 'Service Charge (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'deliveryFee', label: 'Delivery Surcharge (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'total', label: 'Grand Total (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'amountPaid', label: 'Amount Paid (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'createdAt', label: 'Order Created Timestamp', dataType: 'DATE', allowedAggregations: ['NONE'] },
        ],
    },
    INVENTORY_STOCK: {
        label: 'Inventory Assets & Stock Levels',
        description: 'Material cost prices, current physical counts, par thresholds, reorder points, and storage zones.',
        fields: [
            { key: 'name', label: 'Material Name', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'sku', label: 'SKU / Barcode', dataType: 'STRING', allowedAggregations: ['NONE'] },
            { key: 'category', label: 'Stock Category', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'materialType', label: 'Material Classification', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'unit', label: 'Consumption Unit', dataType: 'STRING', allowedAggregations: ['NONE'] },
            { key: 'costPrice', label: 'Unit Cost Price (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'AVG', 'MIN', 'MAX'] },
            { key: 'currentStock', label: 'Current On-Hand Stock', dataType: 'NUMBER', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'minThreshold', label: 'Minimum Par Threshold', dataType: 'NUMBER', allowedAggregations: ['NONE', 'AVG'] },
            { key: 'reorderQuantity', label: 'Reorder Batch Size', dataType: 'NUMBER', allowedAggregations: ['NONE', 'SUM'] },
            { key: 'storageCondition', label: 'Storage Temperature Condition', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'totalValuation', label: 'Total Capitalized Valuation (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'createdAt', label: 'Onboarded Timestamp', dataType: 'DATE', allowedAggregations: ['NONE'] },
        ],
    },
    PAYMENTS_SETTLEMENTS: {
        label: 'Payments, Tender & Treasury',
        description: 'Inbound AR collections, outbound AP payouts, clearing accounts, and transaction references.',
        fields: [
            { key: 'paymentNumber', label: 'Payment Slip #', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'paymentFlow', label: 'Accounting Flow (AR / AP)', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'paymentMethod', label: 'Tender Settlement Method', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'clearingAccount', label: 'General Clearing Account', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'transactionReference', label: 'M-Pesa / Bank Ref Code', dataType: 'STRING', allowedAggregations: ['NONE'] },
            { key: 'amount', label: 'Settlement Amount (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
            { key: 'status', label: 'Treasury Status', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'isReversed', label: 'Storno Reversal Flag', dataType: 'BOOLEAN', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'createdAt', label: 'Settlement Timestamp', dataType: 'DATE', allowedAggregations: ['NONE'] },
        ],
    },
    WORKFORCE_ATTENDANCE: {
        label: 'Workforce Time & Attendance (HCM)',
        description: 'Clock-in/out records, shift durations, overtime hours, and attendance punctuality audit.',
        fields: [
            { key: 'employeeName', label: 'Staff Member Name', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'role', label: 'Operational Role', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'clockInAt', label: 'Clock-In Timestamp', dataType: 'DATE', allowedAggregations: ['NONE'] },
            { key: 'clockOutAt', label: 'Clock-Out Timestamp', dataType: 'DATE', allowedAggregations: ['NONE'] },
            { key: 'totalDurationMinutes', label: 'Total Shift Minutes', dataType: 'NUMBER', allowedAggregations: ['NONE', 'SUM', 'AVG'] },
            { key: 'regularHours', label: 'Standard Regular Hours', dataType: 'NUMBER', allowedAggregations: ['NONE', 'SUM', 'AVG'] },
            { key: 'overtimeHours', label: 'Overtime Hours Logged', dataType: 'NUMBER', allowedAggregations: ['NONE', 'SUM', 'AVG'] },
            { key: 'verificationStatus', label: 'Punctuality Audit Status', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'status', label: 'Shift Verification State', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
        ],
    },
    MENU_PRODUCT_SALES: {
        label: 'Menu Items & Product Velocity',
        description: 'Item sales volumes, unit prices, modifiers, gross margins, and kitchen dispatch stations.',
        fields: [
            { key: 'itemName', label: 'Menu Item Name', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'sku', label: 'Product SKU', dataType: 'STRING', allowedAggregations: ['NONE'] },
            { key: 'categoryName', label: 'Menu Category', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'kitchenStation', label: 'Kitchen Prep Station', dataType: 'STRING', allowedAggregations: ['NONE', 'COUNT'] },
            { key: 'unitPrice', label: 'Base Menu Price (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'AVG', 'MIN', 'MAX'] },
            { key: 'quantitySold', label: 'Total Quantity Sold', dataType: 'NUMBER', allowedAggregations: ['NONE', 'SUM', 'AVG'] },
            { key: 'grossRevenue', label: 'Gross Revenue Generated (KES)', dataType: 'CURRENCY', allowedAggregations: ['NONE', 'SUM', 'AVG', 'MIN', 'MAX'] },
        ],
    },
};
const getAvailableSubjectAreas = () => {
    return Object.entries(exports.SUBJECT_AREA_METADATA).map(([key, val]) => ({
        key: key,
        label: val.label,
        description: val.description,
        fields: val.fields,
    }));
};
exports.getAvailableSubjectAreas = getAvailableSubjectAreas;
// ----------------------------------------------------------------------------
// DYNAMIC QUERY EXECUTION ENGINE
// ----------------------------------------------------------------------------
const executeCustomReportQuery = async (tenantId, config) => {
    const startTime = Date.now();
    // Parse Date Range
    let startDate;
    let endDate;
    if (config.dateRange?.startDate) {
        startDate = new Date(config.dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
    }
    if (config.dateRange?.endDate) {
        endDate = new Date(config.dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
    }
    let rows = [];
    // ==========================================================================
    // DOMAIN 1: ORDERS_REVENUE
    // ==========================================================================
    if (config.subjectArea === 'ORDERS_REVENUE') {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
            startDate ? (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, startDate) : undefined,
            endDate ? (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, endDate) : undefined,
        ].filter(Boolean);
        const queryResult = await db_1.db
            .select({
            orderNumber: schema_1.orders.orderNumber,
            orderType: schema_1.orders.orderType,
            status: schema_1.orders.status,
            paymentStatus: schema_1.orders.paymentStatus,
            tableName: schema_1.orders.tableName,
            customerName: schema_1.orders.customerName,
            customerPhone: schema_1.orders.customerPhone,
            subtotal: (0, drizzle_orm_1.sql) `${schema_1.orders.subtotal}::numeric`,
            discountTotal: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.discountTotal}, 0)::numeric`,
            tax: (0, drizzle_orm_1.sql) `${schema_1.orders.tax}::numeric`,
            cateringLevy: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.cateringLevy}, 0)::numeric`,
            serviceCharge: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.serviceCharge}, 0)::numeric`,
            deliveryFee: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.deliveryFee}, 0)::numeric`,
            total: (0, drizzle_orm_1.sql) `${schema_1.orders.total}::numeric`,
            amountPaid: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.amountPaid}, 0)::numeric`,
            createdAt: schema_1.orders.createdAt,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
            .limit(config.limit);
        rows = queryResult.map((r) => ({
            ...r,
            subtotal: Number(r.subtotal),
            discountTotal: Number(r.discountTotal),
            tax: Number(r.tax),
            cateringLevy: Number(r.cateringLevy),
            serviceCharge: Number(r.serviceCharge),
            deliveryFee: Number(r.deliveryFee),
            total: Number(r.total),
            amountPaid: Number(r.amountPaid),
            createdAt: new Date(r.createdAt).toISOString(),
        }));
    }
    // ==========================================================================
    // DOMAIN 2: INVENTORY_STOCK
    // ==========================================================================
    else if (config.subjectArea === 'INVENTORY_STOCK') {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId),
            (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true),
        ].filter(Boolean);
        const queryResult = await db_1.db
            .select({
            name: schema_1.inventoryItems.name,
            sku: schema_1.inventoryItems.sku,
            category: schema_1.inventoryItems.category,
            materialType: schema_1.inventoryItems.materialType,
            unit: schema_1.inventoryItems.unit,
            costPrice: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.costPrice}::numeric`,
            currentStock: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.currentStock}::numeric`,
            minThreshold: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.minThreshold}::numeric`,
            reorderQuantity: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reorderQuantity}::numeric`,
            storageCondition: schema_1.inventoryItems.storageCondition,
            totalValuation: (0, drizzle_orm_1.sql) `(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice})::numeric`,
            createdAt: schema_1.inventoryItems.createdAt,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice})`))
            .limit(config.limit);
        rows = queryResult.map((r) => ({
            ...r,
            costPrice: Number(r.costPrice),
            currentStock: Number(r.currentStock),
            minThreshold: Number(r.minThreshold),
            reorderQuantity: Number(r.reorderQuantity),
            totalValuation: Number(r.totalValuation),
            createdAt: new Date(r.createdAt).toISOString(),
        }));
    }
    // ==========================================================================
    // DOMAIN 3: PAYMENTS_SETTLEMENTS
    // ==========================================================================
    else if (config.subjectArea === 'PAYMENTS_SETTLEMENTS') {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId),
            startDate ? (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, startDate) : undefined,
            endDate ? (0, drizzle_orm_1.lte)(schema_1.payments.createdAt, endDate) : undefined,
        ].filter(Boolean);
        const queryResult = await db_1.db
            .select({
            paymentNumber: schema_1.payments.paymentNumber,
            paymentFlow: schema_1.payments.paymentFlow,
            paymentMethod: schema_1.payments.paymentMethod,
            clearingAccount: schema_1.payments.clearingAccount,
            transactionReference: schema_1.payments.transactionReference,
            amount: (0, drizzle_orm_1.sql) `${schema_1.payments.amount}::numeric`,
            status: schema_1.payments.status,
            isReversed: schema_1.payments.isReversed,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))
            .limit(config.limit);
        rows = queryResult.map((r) => ({
            ...r,
            amount: Number(r.amount),
            createdAt: new Date(r.createdAt).toISOString(),
        }));
    }
    // ==========================================================================
    // DOMAIN 4: WORKFORCE_ATTENDANCE
    // ==========================================================================
    else if (config.subjectArea === 'WORKFORCE_ATTENDANCE') {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId),
            startDate ? (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockInAt, startDate) : undefined,
            endDate ? (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockInAt, endDate) : undefined,
        ].filter(Boolean);
        const queryResult = await db_1.db
            .select({
            employeeName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
            clockInAt: schema_1.attendanceRecords.clockInAt,
            clockOutAt: schema_1.attendanceRecords.clockOutAt,
            totalDurationMinutes: schema_1.attendanceRecords.totalDurationMinutes,
            regularHours: (0, drizzle_orm_1.sql) `${schema_1.attendanceRecords.regularHours}::numeric`,
            overtimeHours: (0, drizzle_orm_1.sql) `${schema_1.attendanceRecords.overtimeHours}::numeric`,
            verificationStatus: schema_1.attendanceRecords.verificationStatus,
            status: schema_1.attendanceRecords.status,
        })
            .from(schema_1.attendanceRecords)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendanceRecords.clockInAt))
            .limit(config.limit);
        rows = queryResult.map((r) => ({
            ...r,
            regularHours: Number(r.regularHours),
            overtimeHours: Number(r.overtimeHours),
            clockInAt: new Date(r.clockInAt).toISOString(),
            clockOutAt: r.clockOutAt ? new Date(r.clockOutAt).toISOString() : null,
        }));
    }
    // ==========================================================================
    // DOMAIN 5: MENU_PRODUCT_SALES
    // ==========================================================================
    else {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
            startDate ? (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, startDate) : undefined,
            endDate ? (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, endDate) : undefined,
            (0, drizzle_orm_1.sql) `lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft')`,
        ].filter(Boolean);
        const queryResult = await db_1.db
            .select({
            itemName: (0, drizzle_orm_1.sql) `coalesce(${schema_1.menuItems.name}, 'Custom Product')`,
            sku: schema_1.menuItems.sku,
            categoryName: (0, drizzle_orm_1.sql) `coalesce(${schema_1.menuCategories.name}, 'General Menu')`,
            kitchenStation: schema_1.menuItems.kitchenStation,
            unitPrice: (0, drizzle_orm_1.sql) `${schema_1.menuItems.price}::numeric`,
            quantitySold: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}), 0)::numeric`,
            grossRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.totalPrice}), 0)::numeric`,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id))
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .groupBy(schema_1.menuItems.id, schema_1.menuItems.name, schema_1.menuItems.sku, schema_1.menuCategories.name, schema_1.menuItems.kitchenStation, schema_1.menuItems.price)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.totalPrice})`))
            .limit(config.limit);
        rows = queryResult.map((r) => ({
            ...r,
            unitPrice: Number(r.unitPrice),
            quantitySold: Number(r.quantitySold),
            grossRevenue: Number(r.grossRevenue),
        }));
    }
    // Apply In-Memory Predicate Filters (if user added client-level rules)
    if (config.filters && config.filters.length > 0) {
        rows = rows.filter((row) => {
            return config.filters.every((f) => {
                const val = row[f.fieldKey];
                if (f.operator === 'EQUALS')
                    return String(val).toLowerCase() === String(f.value).toLowerCase();
                if (f.operator === 'NOT_EQUALS')
                    return String(val).toLowerCase() !== String(f.value).toLowerCase();
                if (f.operator === 'CONTAINS')
                    return String(val).toLowerCase().includes(String(f.value).toLowerCase());
                if (f.operator === 'GREATER_THAN')
                    return Number(val) > Number(f.value);
                if (f.operator === 'GREATER_THAN_OR_EQUAL')
                    return Number(val) >= Number(f.value);
                if (f.operator === 'LESS_THAN')
                    return Number(val) < Number(f.value);
                if (f.operator === 'LESS_THAN_OR_EQUAL')
                    return Number(val) <= Number(f.value);
                if (f.operator === 'IS_NULL')
                    return val === null || val === undefined;
                if (f.operator === 'IS_NOT_NULL')
                    return val !== null && val !== undefined;
                return true;
            });
        });
    }
    // Projection: Keep only selected fields
    const projectedColumns = config.selectedFields.map((field) => {
        const meta = exports.SUBJECT_AREA_METADATA[config.subjectArea].fields.find((f) => f.key === field.fieldKey);
        return {
            key: field.fieldKey,
            label: field.customLabel || meta?.label || field.fieldKey,
            dataType: meta?.dataType || 'STRING',
            aggregation: field.aggregation,
        };
    });
    const projectedRows = rows.map((row) => {
        const projected = {};
        for (const col of projectedColumns) {
            projected[col.key] = row[col.key] ?? null;
        }
        return projected;
    });
    const durationMs = Date.now() - startTime;
    return {
        columns: projectedColumns,
        rows: projectedRows,
        rowCount: projectedRows.length,
        executionDurationMs: durationMs,
        subjectArea: config.subjectArea,
    };
};
exports.executeCustomReportQuery = executeCustomReportQuery;
// ----------------------------------------------------------------------------
// SAVE REPORT DEFINITION TO DATABASE
// ----------------------------------------------------------------------------
const saveCustomReport = async (tenantId, input) => {
    const code = `CUSTOM_${input.config.subjectArea}_${Date.now().toString().slice(-6)}`;
    const [saved] = await db_1.db
        .insert(schema_1.reportDefinitions)
        .values({
        tenantId,
        code,
        name: input.name,
        category: input.category,
        description: input.description,
        supportedFormats: ['CSV', 'JSON', 'PDF', 'XLSX'],
        parameterSchema: {
            requiresDateRange: true,
            requiresBranch: true,
            customFilters: input.config.filters.map((f) => ({
                key: f.fieldKey,
                label: f.fieldKey,
                type: 'text',
            })),
        },
        isSystem: false,
        isActive: true,
    })
        .returning();
    return saved;
};
exports.saveCustomReport = saveCustomReport;
const listTenantCustomReports = async (tenantId) => {
    return await db_1.db
        .select()
        .from(schema_1.reportDefinitions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reportDefinitions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.isSystem, false)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.reportDefinitions.createdAt));
};
exports.listTenantCustomReports = listTenantCustomReports;
