// apps/api/src/index.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // <-- Load this FIRST

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import tenantRoutes from './routes/tenant.routes';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import inventoryRoutes from './routes/inventory.routes';
import kitchenRoutes from './routes/kitchen.routes';
import tableRoutes from './routes/table.routes';
import reservationRoutes from './routes/reservation.routes';
import waitlistRoutes from './routes/waitlist.routes';
import deliveryRoutes from './routes/delivery.routes';
import branchRoutes from './routes/branch.routes';
import systemRoutes from './routes/system.routes';
import modifierRoutes from './routes/modifier.routes';
import comboRoutes from './routes/combo.routes';
import menuItemRoutes from './routes/menu-item.routes';
import pricingRoutes from './routes/pricing.routes';
import availabilityRoutes from './routes/availability.routes';
import recipeRoutes from './routes/recipe.routes';
import unitConversionRoutes from './routes/unit-conversion.routes';
import inventoryItemRoutes from './routes/inventory-item.routes';
import stockMovementRoutes from './routes/stock-movement.routes';
import stockCountRoutes from './routes/stock-count.routes';
import stockTransferRoutes from './routes/stock-transfer.routes';
import businessRoutes from './routes/business.routes';
import inventoryBatchRoutes from './routes/inventory-batch.routes';
import inventoryReorderRoutes from './routes/inventory-reorder.routes';
import wasteLogRoutes from './routes/waste-log.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRequestRoutes from './routes/purchase-request.routes';
import purchaseOrderRoutes from './routes/purchase-order.routes';
import goodsReceivedRoutes from './routes/goods-received.routes';
import supplierInvoiceRoutes from './routes/supplier-invoice.routes';
import supplierReturnRoutes from './routes/supplier-return.routes';
import logisticsFleetRoutes from './routes/logistics-fleet.routes';
import warehouseLocationRoutes from './routes/warehouse-location.routes';
import paymentRoutes from './routes/payment.routes';
import reconciliationRoutes from './routes/payment-reconciliation.routes';
import mpesaRoutes from './routes/mpesa.routes';
import refundRoutes from './routes/refund.routes';
import cashDrawerRoutes from './routes/cash-drawer.routes';
import restaurantTableRoutes from './routes/restaurant-table.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';

const app: Express = express();
const port = process.env.PORT || 8000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Servora API is running', timestamp: new Date().toISOString() });
});

// Mount modular API routes
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/menu/items', menuItemRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/menu/modifiers', modifierRoutes);
app.use('/api/v1/menu/combos', comboRoutes);
app.use('/api/v1/menu/pricing', pricingRoutes);
app.use('/api/v1/menu/availability', availabilityRoutes);
app.use('/api/v1/menu/recipes', recipeRoutes);
app.use('/api/v1/menu/recipes/units', unitConversionRoutes);
app.use('/api/v1/inventory/items', inventoryItemRoutes);
app.use('/api/v1/inventory/movements', stockMovementRoutes);
app.use('/api/v1/inventory/counts', stockCountRoutes);
app.use('/api/v1/inventory/transfers', stockTransferRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/inventory/batches', inventoryBatchRoutes);
app.use('/api/v1/inventory/reorder', inventoryReorderRoutes);
app.use('/api/v1/inventory/waste', wasteLogRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchasing/requests', purchaseRequestRoutes); 
app.use('/api/v1/purchasing/orders', purchaseOrderRoutes); 
app.use('/api/v1/purchasing/receiving', goodsReceivedRoutes);
app.use('/api/v1/purchasing/invoices', supplierInvoiceRoutes);
app.use('/api/v1/purchasing/returns', supplierReturnRoutes);
app.use('/api/v1/inventory/transfers/fleet', logisticsFleetRoutes);
app.use('/api/v1/inventory/locations', warehouseLocationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payments/reconciliation', reconciliationRoutes);
app.use('/api/v1/payments/mpesa', mpesaRoutes);
app.use('/api/v1/payments/refunds', refundRoutes);
app.use('/api/v1/cash-management/drawers', cashDrawerRoutes);
app.use('/api/v1/restaurant/tables', restaurantTableRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);


app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`[server]: Servora API is running at http://localhost:${port}`);
});