import { eq, and, desc, asc, sql, gte, lte, or, ilike, SQL } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  menuCategories,
  inventoryItems,
  payments,
  attendanceRecords,
  users,
  branches,
  reportDefinitions,
} from '../config/schema';
import {
  CustomReportConfig,
  SaveCustomReportDefinitionInput,
  SubjectArea,
} from '../validators/custom-report-builder.validator';

// ----------------------------------------------------------------------------
// SUBJECT AREA FIELD DEFINITIONS & SCHEMAS
// ----------------------------------------------------------------------------

export interface FieldMetadata {
  key: string;
  label: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN';
  allowedAggregations: ('NONE' | 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX')[];
}

export const SUBJECT_AREA_METADATA: Record<
  SubjectArea,
  { label: string; description: string; fields: FieldMetadata[] }
> = {
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

export const getAvailableSubjectAreas = () => {
  return Object.entries(SUBJECT_AREA_METADATA).map(([key, val]) => ({
    key: key as SubjectArea,
    label: val.label,
    description: val.description,
    fields: val.fields,
  }));
};

// ----------------------------------------------------------------------------
// DYNAMIC QUERY EXECUTION ENGINE
// ----------------------------------------------------------------------------

export const executeCustomReportQuery = async (
  tenantId: number,
  config: CustomReportConfig
) => {
  const startTime = Date.now();

  // Parse Date Range
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (config.dateRange?.startDate) {
    startDate = new Date(config.dateRange.startDate);
    startDate.setHours(0, 0, 0, 0);
  }
  if (config.dateRange?.endDate) {
    endDate = new Date(config.dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);
  }

  let rows: Record<string, any>[] = [];

  // ==========================================================================
  // DOMAIN 1: ORDERS_REVENUE
  // ==========================================================================
  if (config.subjectArea === 'ORDERS_REVENUE') {
    const conditions = [
      eq(orders.tenantId, tenantId),
      startDate ? gte(orders.createdAt, startDate) : undefined,
      endDate ? lte(orders.createdAt, endDate) : undefined,
    ].filter(Boolean);

    const queryResult = await db
      .select({
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        tableName: orders.tableName,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        subtotal: sql<number>`${orders.subtotal}::numeric`,
        discountTotal: sql<number>`coalesce(${orders.discountTotal}, 0)::numeric`,
        tax: sql<number>`${orders.tax}::numeric`,
        cateringLevy: sql<number>`coalesce(${orders.cateringLevy}, 0)::numeric`,
        serviceCharge: sql<number>`coalesce(${orders.serviceCharge}, 0)::numeric`,
        deliveryFee: sql<number>`coalesce(${orders.deliveryFee}, 0)::numeric`,
        total: sql<number>`${orders.total}::numeric`,
        amountPaid: sql<number>`coalesce(${orders.amountPaid}, 0)::numeric`,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
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
      eq(inventoryItems.tenantId, tenantId),
      eq(inventoryItems.isActive, true),
    ].filter(Boolean);

    const queryResult = await db
      .select({
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        category: inventoryItems.category,
        materialType: inventoryItems.materialType,
        unit: inventoryItems.unit,
        costPrice: sql<number>`${inventoryItems.costPrice}::numeric`,
        currentStock: sql<number>`${inventoryItems.currentStock}::numeric`,
        minThreshold: sql<number>`${inventoryItems.minThreshold}::numeric`,
        reorderQuantity: sql<number>`${inventoryItems.reorderQuantity}::numeric`,
        storageCondition: inventoryItems.storageCondition,
        totalValuation: sql<number>`(${inventoryItems.currentStock} * ${inventoryItems.costPrice})::numeric`,
        createdAt: inventoryItems.createdAt,
      })
      .from(inventoryItems)
      .where(and(...conditions))
      .orderBy(desc(sql`(${inventoryItems.currentStock} * ${inventoryItems.costPrice})`))
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
      eq(payments.tenantId, tenantId),
      startDate ? gte(payments.createdAt, startDate) : undefined,
      endDate ? lte(payments.createdAt, endDate) : undefined,
    ].filter(Boolean);

    const queryResult = await db
      .select({
        paymentNumber: payments.paymentNumber,
        paymentFlow: payments.paymentFlow,
        paymentMethod: payments.paymentMethod,
        clearingAccount: payments.clearingAccount,
        transactionReference: payments.transactionReference,
        amount: sql<number>`${payments.amount}::numeric`,
        status: payments.status,
        isReversed: payments.isReversed,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))
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
      eq(attendanceRecords.tenantId, tenantId),
      startDate ? gte(attendanceRecords.clockInAt, startDate) : undefined,
      endDate ? lte(attendanceRecords.clockInAt, endDate) : undefined,
    ].filter(Boolean);

    const queryResult = await db
      .select({
        employeeName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
        clockInAt: attendanceRecords.clockInAt,
        clockOutAt: attendanceRecords.clockOutAt,
        totalDurationMinutes: attendanceRecords.totalDurationMinutes,
        regularHours: sql<number>`${attendanceRecords.regularHours}::numeric`,
        overtimeHours: sql<number>`${attendanceRecords.overtimeHours}::numeric`,
        verificationStatus: attendanceRecords.verificationStatus,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(users, eq(attendanceRecords.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.clockInAt))
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
      eq(orders.tenantId, tenantId),
      startDate ? gte(orders.createdAt, startDate) : undefined,
      endDate ? lte(orders.createdAt, endDate) : undefined,
      sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
    ].filter(Boolean);

    const queryResult = await db
      .select({
        itemName: sql<string>`coalesce(${menuItems.name}, 'Custom Product')`,
        sku: menuItems.sku,
        categoryName: sql<string>`coalesce(${menuCategories.name}, 'General Menu')`,
        kitchenStation: menuItems.kitchenStation,
        unitPrice: sql<number>`${menuItems.price}::numeric`,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::numeric`,
        grossRevenue: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)::numeric`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(and(...conditions))
      .groupBy(menuItems.id, menuItems.name, menuItems.sku, menuCategories.name, menuItems.kitchenStation, menuItems.price)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
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
        if (f.operator === 'EQUALS') return String(val).toLowerCase() === String(f.value).toLowerCase();
        if (f.operator === 'NOT_EQUALS') return String(val).toLowerCase() !== String(f.value).toLowerCase();
        if (f.operator === 'CONTAINS') return String(val).toLowerCase().includes(String(f.value).toLowerCase());
        if (f.operator === 'GREATER_THAN') return Number(val) > Number(f.value);
        if (f.operator === 'GREATER_THAN_OR_EQUAL') return Number(val) >= Number(f.value);
        if (f.operator === 'LESS_THAN') return Number(val) < Number(f.value);
        if (f.operator === 'LESS_THAN_OR_EQUAL') return Number(val) <= Number(f.value);
        if (f.operator === 'IS_NULL') return val === null || val === undefined;
        if (f.operator === 'IS_NOT_NULL') return val !== null && val !== undefined;
        return true;
      });
    });
  }

  // Projection: Keep only selected fields
  const projectedColumns = config.selectedFields.map((field) => {
    const meta = SUBJECT_AREA_METADATA[config.subjectArea].fields.find((f) => f.key === field.fieldKey);
    return {
      key: field.fieldKey,
      label: field.customLabel || meta?.label || field.fieldKey,
      dataType: meta?.dataType || 'STRING',
      aggregation: field.aggregation,
    };
  });

  const projectedRows = rows.map((row) => {
    const projected: Record<string, any> = {};
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

// ----------------------------------------------------------------------------
// SAVE REPORT DEFINITION TO DATABASE
// ----------------------------------------------------------------------------

export const saveCustomReport = async (
  tenantId: number,
  input: SaveCustomReportDefinitionInput
) => {
  const code = `CUSTOM_${input.config.subjectArea}_${Date.now().toString().slice(-6)}`;

  const [saved] = await db
    .insert(reportDefinitions)
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

export const listTenantCustomReports = async (tenantId: number) => {
  return await db
    .select()
    .from(reportDefinitions)
    .where(and(eq(reportDefinitions.tenantId, tenantId), eq(reportDefinitions.isSystem, false)))
    .orderBy(desc(reportDefinitions.createdAt));
};