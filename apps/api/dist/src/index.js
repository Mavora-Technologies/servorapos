"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env' }); // <-- Load this FIRST
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const tenant_routes_1 = __importDefault(require("./routes/tenant.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const menu_routes_1 = __importDefault(require("./routes/menu.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const kitchen_routes_1 = __importDefault(require("./routes/kitchen.routes"));
const table_routes_1 = __importDefault(require("./routes/table.routes"));
const reservation_routes_1 = __importDefault(require("./routes/reservation.routes"));
const waitlist_routes_1 = __importDefault(require("./routes/waitlist.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const branch_routes_1 = __importDefault(require("./routes/branch.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const modifier_routes_1 = __importDefault(require("./routes/modifier.routes"));
const combo_routes_1 = __importDefault(require("./routes/combo.routes"));
const menu_item_routes_1 = __importDefault(require("./routes/menu-item.routes"));
const pricing_routes_1 = __importDefault(require("./routes/pricing.routes"));
const availability_routes_1 = __importDefault(require("./routes/availability.routes"));
const recipe_routes_1 = __importDefault(require("./routes/recipe.routes"));
const unit_conversion_routes_1 = __importDefault(require("./routes/unit-conversion.routes"));
const inventory_item_routes_1 = __importDefault(require("./routes/inventory-item.routes"));
const stock_movement_routes_1 = __importDefault(require("./routes/stock-movement.routes"));
const stock_count_routes_1 = __importDefault(require("./routes/stock-count.routes"));
const stock_transfer_routes_1 = __importDefault(require("./routes/stock-transfer.routes"));
const business_routes_1 = __importDefault(require("./routes/business.routes"));
const inventory_batch_routes_1 = __importDefault(require("./routes/inventory-batch.routes"));
const inventory_reorder_routes_1 = __importDefault(require("./routes/inventory-reorder.routes"));
const waste_log_routes_1 = __importDefault(require("./routes/waste-log.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const purchase_request_routes_1 = __importDefault(require("./routes/purchase-request.routes"));
const purchase_order_routes_1 = __importDefault(require("./routes/purchase-order.routes"));
const goods_received_routes_1 = __importDefault(require("./routes/goods-received.routes"));
const supplier_invoice_routes_1 = __importDefault(require("./routes/supplier-invoice.routes"));
const supplier_return_routes_1 = __importDefault(require("./routes/supplier-return.routes"));
const logistics_fleet_routes_1 = __importDefault(require("./routes/logistics-fleet.routes"));
const warehouse_location_routes_1 = __importDefault(require("./routes/warehouse-location.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const payment_reconciliation_routes_1 = __importDefault(require("./routes/payment-reconciliation.routes"));
const mpesa_routes_1 = __importDefault(require("./routes/mpesa.routes"));
const refund_routes_1 = __importDefault(require("./routes/refund.routes"));
const cash_drawer_routes_1 = __importDefault(require("./routes/cash-drawer.routes"));
const restaurant_table_routes_1 = __importDefault(require("./routes/restaurant-table.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 8000;
// apps/api/src/index.ts
const allowedOrigins = [
    'http://localhost:3000',
    'https://servora.mavoratechnologies.com',
    'https://www.servora.mavoratechnologies.com',
    'https://servorapos.pages.dev',
    process.env.FRONTEND_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests (Postman, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS policy violation: Origin ${origin} not allowed.`));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Servora API is running', timestamp: new Date().toISOString() });
});
// Mount modular API routes
app.use('/api/v1/system', system_routes_1.default);
app.use('/api/v1/tenants', tenant_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/menu', menu_routes_1.default);
app.use('/api/v1/menu/items', menu_item_routes_1.default);
app.use('/api/v1/orders', order_routes_1.default);
app.use('/api/v1/inventory', inventory_routes_1.default);
app.use('/api/v1/kitchen', kitchen_routes_1.default);
app.use('/api/v1/tables', table_routes_1.default);
app.use('/api/v1/reservations', reservation_routes_1.default);
app.use('/api/v1/waitlist', waitlist_routes_1.default);
app.use('/api/v1/delivery', delivery_routes_1.default);
app.use('/api/v1/menu/modifiers', modifier_routes_1.default);
app.use('/api/v1/menu/combos', combo_routes_1.default);
app.use('/api/v1/menu/pricing', pricing_routes_1.default);
app.use('/api/v1/menu/availability', availability_routes_1.default);
app.use('/api/v1/menu/recipes', recipe_routes_1.default);
app.use('/api/v1/menu/recipes/units', unit_conversion_routes_1.default);
app.use('/api/v1/inventory/items', inventory_item_routes_1.default);
app.use('/api/v1/inventory/movements', stock_movement_routes_1.default);
app.use('/api/v1/inventory/counts', stock_count_routes_1.default);
app.use('/api/v1/inventory/transfers', stock_transfer_routes_1.default);
app.use('/api/v1/branches', branch_routes_1.default);
app.use('/api/v1/business', business_routes_1.default);
app.use('/api/v1/inventory/batches', inventory_batch_routes_1.default);
app.use('/api/v1/inventory/reorder', inventory_reorder_routes_1.default);
app.use('/api/v1/inventory/waste', waste_log_routes_1.default);
app.use('/api/v1/suppliers', supplier_routes_1.default);
app.use('/api/v1/purchasing/requests', purchase_request_routes_1.default);
app.use('/api/v1/purchasing/orders', purchase_order_routes_1.default);
app.use('/api/v1/purchasing/receiving', goods_received_routes_1.default);
app.use('/api/v1/purchasing/invoices', supplier_invoice_routes_1.default);
app.use('/api/v1/purchasing/returns', supplier_return_routes_1.default);
app.use('/api/v1/inventory/transfers/fleet', logistics_fleet_routes_1.default);
app.use('/api/v1/inventory/locations', warehouse_location_routes_1.default);
app.use('/api/v1/payments', payment_routes_1.default);
app.use('/api/v1/payments/reconciliation', payment_reconciliation_routes_1.default);
app.use('/api/v1/payments/mpesa', mpesa_routes_1.default);
app.use('/api/v1/payments/refunds', refund_routes_1.default);
app.use('/api/v1/cash-management/drawers', cash_drawer_routes_1.default);
app.use('/api/v1/restaurant/tables', restaurant_table_routes_1.default);
app.use('/api/v1/analytics', analytics_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});
app.listen(port, () => {
    console.log(`[server]: Servora API is running at http://localhost:${port}`);
});
