// apps/api/src/index.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // <-- Load this FIRST

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Core & Authentication Routes
import systemRoutes from './routes/system.routes';
import tenantRoutes from './routes/tenant.routes';
import authRoutes from './routes/auth.routes';
import branchRoutes from './routes/branch.routes';
import businessRoutes from './routes/business.routes';

// Menu & Catalog Routes
import modifierRoutes from './routes/modifier.routes';
import comboRoutes from './routes/combo.routes';
import menuItemRoutes from './routes/menu-item.routes';
import pricingRoutes from './routes/pricing.routes';
import availabilityRoutes from './routes/availability.routes';
import unitConversionRoutes from './routes/unit-conversion.routes';
import recipeRoutes from './routes/recipe.routes';
import menuRoutes from './routes/menu.routes';

// Inventory, Warehouse & Logistics Routes
import inventoryLocationRoutes from './routes/inventory-locations.routes';
import warehouseLocationRoutes from './routes/warehouse-location.routes';
import logisticsFleetRoutes from './routes/logistics-fleet.routes';
import stockTransferRoutes from './routes/stock-transfer.routes';
import inventoryItemRoutes from './routes/inventory-item.routes';
import stockMovementRoutes from './routes/stock-movement.routes';
import stockCountRoutes from './routes/stock-count.routes';
import inventoryBatchRoutes from './routes/inventory-batch.routes';
import inventoryReorderRoutes from './routes/inventory-reorder.routes';
import wasteLogRoutes from './routes/waste-log.routes';
import inventoryRoutes from './routes/inventory.routes';

// Purchasing & Supplier Routes
import purchaseRequestRoutes from './routes/purchase-request.routes';
import purchaseOrderRoutes from './routes/purchase-order.routes';
import goodsReceivedRoutes from './routes/goods-received.routes';
import supplierInvoiceRoutes from './routes/supplier-invoice.routes';
import supplierReturnRoutes from './routes/supplier-return.routes';
import supplierRoutes from './routes/supplier.routes';

// Dining, Table Management & Hospitality Routes
import restaurantTableRoutes from './routes/restaurant-table.routes';
import tableRoutes from './routes/table.routes';
import reservationRoutes from './routes/reservation.routes';
import waitlistRoutes from './routes/waitlist.routes';
import kitchenRoutes from './routes/kitchen.routes';

// Sales Orders & Fulfillment Routes
import deliveryRoutes from './routes/delivery.routes';
import orderRoutes from './routes/order.routes';

// Financial, Tender & Reconciliation Routes
import reconciliationRoutes from './routes/payment-reconciliation.routes';
import mpesaRoutes from './routes/mpesa.routes';
import refundRoutes from './routes/refund.routes';
import paymentRoutes from './routes/payment.routes';
import cashDrawerRoutes from './routes/cash-drawer.routes';

// Intelligence & Real-time Telemetry Routes
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';

// Human Capital, Staff & Governance Routes
import roleRoutes from './routes/role.routes';
import staffRoutes from './routes/staff.routes';
import scheduleRoutes from './routes/schedule.routes';
import attendanceRoutes from './routes/attendance.routes';
import handoverRoutes from './routes/handover.routes';
import cashierAssignmentRoutes from './routes/cashier-assignment.routes';
import performanceRoutes from './routes/performance.routes';
import financialRoutes from './routes/financial.routes';
import serviceModelRoutes from './routes/service-model.routes';
import receiptRoutes from './routes/receipt.routes';
import printerRoutes from './routes/printer.routes';
import kitchenSettingsRoutes from './routes/kitchen-settings.routes';
import paymentIntegrationRoutes from './routes/payment-integration.routes';
import messagingRoutes from './routes/messaging-integration.routes';
import orderIntegrationRoutes from './routes/order-integration.routes';
import auditLogRoutes from './routes/audit-log.routes';
import offlineSettingsRoutes from './routes/offline-settings.routes';
import deviceRoutes from './routes/device.routes';
import billingRoutes from './routes/billing.routes';
import securitySettingsRoutes from './routes/security-settings.routes';
import helpRoutes from './routes/help.routes';
import reportsRoutes from './routes/reports.routes';
import salesReportRoutes from './routes/sales-report.routes';
import productReportRoutes from './routes/product-report.routes';
import paymentReportRoutes from './routes/payment-report.routes';
import inventoryReportRoutes from './routes/inventory-report.routes';
import foodCostingReportRoutes from './routes/food-costing-report.routes';
import performanceReportRoutes from './routes/performance-report.routes';
import customReportBuilderRoutes from './routes/custom-report-builder.routes';
import savedReportsRoutes from './routes/saved-reports.routes';
import dataExportsRoutes from './routes/data-exports.routes';

const app: Express = express();
const port = process.env.PORT || 8000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://servora.mavoratechnologies.com',
  'https://www.servora.mavoratechnologies.com',
  'https://servorapos.pages.dev',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: Origin ${origin} not allowed.`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Servora API is running',
    timestamp: new Date().toISOString(),
  });
});

/* ==========================================================================
   MOUNT MODULAR API ROUTES (ORDERED FROM MOST SPECIFIC TO LEAST SPECIFIC)
   ========================================================================== */

// 1. System, Tenant & Core Infrastructure
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/business', businessRoutes);

// 2. Menu Sub-modules & Nested Endpoints (Prioritized over /api/v1/menu)
app.use('/api/v1/menu/items', menuItemRoutes);
app.use('/api/v1/menu/modifiers', modifierRoutes);
app.use('/api/v1/menu/combos', comboRoutes);
app.use('/api/v1/menu/pricing', pricingRoutes);
app.use('/api/v1/menu/availability', availabilityRoutes);
app.use('/api/v1/menu/recipes/units', unitConversionRoutes);
app.use('/api/v1/menu/recipes', recipeRoutes);
app.use('/api/v1/menu', menuRoutes);

// 3. Inventory Sub-modules, WMS, Topology & Fleet (Prioritized over /api/v1/inventory)
app.use('/api/v1/inventory/locations', inventoryLocationRoutes);
app.use('/api/v1/inventory/warehouse-locations', warehouseLocationRoutes);
app.use('/api/v1/inventory/transfers/fleet', logisticsFleetRoutes);
app.use('/api/v1/inventory/transfers', stockTransferRoutes);
app.use('/api/v1/inventory/items', inventoryItemRoutes);
app.use('/api/v1/inventory/movements', stockMovementRoutes);
app.use('/api/v1/inventory/counts', stockCountRoutes);
app.use('/api/v1/inventory/batches', inventoryBatchRoutes);
app.use('/api/v1/inventory/reorder', inventoryReorderRoutes);
app.use('/api/v1/inventory/waste', wasteLogRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// 4. Purchasing & Supplier Supply Chain
app.use('/api/v1/purchasing/requests', purchaseRequestRoutes);
app.use('/api/v1/purchasing/orders', purchaseOrderRoutes);
app.use('/api/v1/purchasing/receiving', goodsReceivedRoutes);
app.use('/api/v1/purchasing/invoices', supplierInvoiceRoutes);
app.use('/api/v1/purchasing/returns', supplierReturnRoutes);
app.use('/api/v1/suppliers', supplierRoutes);

// 5. Hospitality, Dining, Tables & Kitchen KDS
app.use('/api/v1/restaurant/tables', restaurantTableRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);

// 6. Orders, Dispatch & Last-Mile Delivery
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/orders', orderRoutes);

// 7. Payments, M-Pesa & Cash Management
app.use('/api/v1/payments/reconciliation', reconciliationRoutes);
app.use('/api/v1/payments/mpesa', mpesaRoutes);
app.use('/api/v1/payments/refunds', refundRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/cash-management/drawers', cashDrawerRoutes);

// 8. Analytics & Real-Time Events
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 9. Human Capital, RBAC Clearances & Staff Management
app.use('/api/v1/staff/roles', roleRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/staff/schedules', scheduleRoutes);
app.use('/api/v1/staff/attendance', attendanceRoutes);
app.use('/api/v1/staff/handover', handoverRoutes);
app.use('/api/v1/staff/cashier-assignments', cashierAssignmentRoutes);
app.use('/api/v1/staff/performance', performanceRoutes);

// 10 . Settings, Financials & Service Models, Receipts & Printers, Kitchen Configurations
app.use('/api/v1/settings/financial', financialRoutes);
app.use('/api/v1/settings/service-models', serviceModelRoutes);
app.use('/api/v1/settings/receipts', receiptRoutes);
app.use('/api/v1/settings/printers', printerRoutes);
app.use('/api/v1/settings/kitchen', kitchenSettingsRoutes);
app.use('/api/v1/settings/integrations/payments', paymentIntegrationRoutes);
app.use('/api/v1/settings/integrations/messaging', messagingRoutes);
app.use('/api/v1/settings/integrations/orders', orderIntegrationRoutes);
app.use('/api/v1/settings/audit-logs', auditLogRoutes);
app.use('/api/v1/settings/offline', offlineSettingsRoutes);
app.use('/api/v1/settings/devices', deviceRoutes);
app.use('/api/v1/settings/billing', billingRoutes);
app.use('/api/v1/settings/security', securitySettingsRoutes);
app.use('/api/v1/help', helpRoutes);
app.use('/api/v1/reports/sales', salesReportRoutes);
app.use('/api/v1/reports/products', productReportRoutes);
app.use('/api/v1/reports/payments', paymentReportRoutes);
app.use('/api/v1/reports/inventory', inventoryReportRoutes);
app.use('/api/v1/reports/food-costing', foodCostingReportRoutes);
app.use('/api/v1/reports/performance', performanceReportRoutes);
app.use('/api/v1/reports/builder', customReportBuilderRoutes);
app.use('/api/v1/reports/saved', savedReportsRoutes);
app.use('/api/v1/reports/exports', dataExportsRoutes);
app.use('/api/v1/reports', reportsRoutes);


/* ==========================================================================
   GLOBAL ERROR HANDLING & SERVER LIFECYCLE
   ========================================================================== */

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`[server]: Servora API is running at http://localhost:${port}`);
});

export default app;