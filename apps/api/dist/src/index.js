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
// Core & Authentication Routes
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const tenant_routes_1 = __importDefault(require("./routes/tenant.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const branch_routes_1 = __importDefault(require("./routes/branch.routes"));
const business_routes_1 = __importDefault(require("./routes/business.routes"));
// Menu & Catalog Routes
const modifier_routes_1 = __importDefault(require("./routes/modifier.routes"));
const combo_routes_1 = __importDefault(require("./routes/combo.routes"));
const menu_item_routes_1 = __importDefault(require("./routes/menu-item.routes"));
const pricing_routes_1 = __importDefault(require("./routes/pricing.routes"));
const availability_routes_1 = __importDefault(require("./routes/availability.routes"));
const unit_conversion_routes_1 = __importDefault(require("./routes/unit-conversion.routes"));
const recipe_routes_1 = __importDefault(require("./routes/recipe.routes"));
const menu_routes_1 = __importDefault(require("./routes/menu.routes"));
// Inventory, Warehouse & Logistics Routes
const inventory_locations_routes_1 = __importDefault(require("./routes/inventory-locations.routes"));
const warehouse_location_routes_1 = __importDefault(require("./routes/warehouse-location.routes"));
const logistics_fleet_routes_1 = __importDefault(require("./routes/logistics-fleet.routes"));
const stock_transfer_routes_1 = __importDefault(require("./routes/stock-transfer.routes"));
const inventory_item_routes_1 = __importDefault(require("./routes/inventory-item.routes"));
const stock_movement_routes_1 = __importDefault(require("./routes/stock-movement.routes"));
const stock_count_routes_1 = __importDefault(require("./routes/stock-count.routes"));
const inventory_batch_routes_1 = __importDefault(require("./routes/inventory-batch.routes"));
const inventory_reorder_routes_1 = __importDefault(require("./routes/inventory-reorder.routes"));
const waste_log_routes_1 = __importDefault(require("./routes/waste-log.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
// Purchasing & Supplier Routes
const purchase_request_routes_1 = __importDefault(require("./routes/purchase-request.routes"));
const purchase_order_routes_1 = __importDefault(require("./routes/purchase-order.routes"));
const goods_received_routes_1 = __importDefault(require("./routes/goods-received.routes"));
const supplier_invoice_routes_1 = __importDefault(require("./routes/supplier-invoice.routes"));
const supplier_return_routes_1 = __importDefault(require("./routes/supplier-return.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
// Dining, Table Management & Hospitality Routes
const restaurant_table_routes_1 = __importDefault(require("./routes/restaurant-table.routes"));
const table_routes_1 = __importDefault(require("./routes/table.routes"));
const reservation_routes_1 = __importDefault(require("./routes/reservation.routes"));
const waitlist_routes_1 = __importDefault(require("./routes/waitlist.routes"));
const kitchen_routes_1 = __importDefault(require("./routes/kitchen.routes"));
// Sales Orders & Fulfillment Routes
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
// Financial, Tender & Reconciliation Routes
const payment_reconciliation_routes_1 = __importDefault(require("./routes/payment-reconciliation.routes"));
const mpesa_routes_1 = __importDefault(require("./routes/mpesa.routes"));
const refund_routes_1 = __importDefault(require("./routes/refund.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const cash_drawer_routes_1 = __importDefault(require("./routes/cash-drawer.routes"));
// Intelligence & Real-time Telemetry Routes
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
// Human Capital, Staff & Governance Routes
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const staff_routes_1 = __importDefault(require("./routes/staff.routes"));
const schedule_routes_1 = __importDefault(require("./routes/schedule.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const handover_routes_1 = __importDefault(require("./routes/handover.routes"));
const cashier_assignment_routes_1 = __importDefault(require("./routes/cashier-assignment.routes"));
const performance_routes_1 = __importDefault(require("./routes/performance.routes"));
const financial_routes_1 = __importDefault(require("./routes/financial.routes"));
const service_model_routes_1 = __importDefault(require("./routes/service-model.routes"));
const receipt_routes_1 = __importDefault(require("./routes/receipt.routes"));
const printer_routes_1 = __importDefault(require("./routes/printer.routes"));
const kitchen_settings_routes_1 = __importDefault(require("./routes/kitchen-settings.routes"));
const payment_integration_routes_1 = __importDefault(require("./routes/payment-integration.routes"));
const messaging_integration_routes_1 = __importDefault(require("./routes/messaging-integration.routes"));
const order_integration_routes_1 = __importDefault(require("./routes/order-integration.routes"));
const audit_log_routes_1 = __importDefault(require("./routes/audit-log.routes"));
const offline_settings_routes_1 = __importDefault(require("./routes/offline-settings.routes"));
const device_routes_1 = __importDefault(require("./routes/device.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const security_settings_routes_1 = __importDefault(require("./routes/security-settings.routes"));
const help_routes_1 = __importDefault(require("./routes/help.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const sales_report_routes_1 = __importDefault(require("./routes/sales-report.routes"));
const product_report_routes_1 = __importDefault(require("./routes/product-report.routes"));
const payment_report_routes_1 = __importDefault(require("./routes/payment-report.routes"));
const inventory_report_routes_1 = __importDefault(require("./routes/inventory-report.routes"));
const food_costing_report_routes_1 = __importDefault(require("./routes/food-costing-report.routes"));
const performance_report_routes_1 = __importDefault(require("./routes/performance-report.routes"));
const custom_report_builder_routes_1 = __importDefault(require("./routes/custom-report-builder.routes"));
const saved_reports_routes_1 = __importDefault(require("./routes/saved-reports.routes"));
const data_exports_routes_1 = __importDefault(require("./routes/data-exports.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const loyalty_routes_1 = __importDefault(require("./routes/loyalty.routes"));
const loyalty_transactions_routes_1 = __importDefault(require("./routes/loyalty-transactions.routes"));
const loyalty_rewards_routes_1 = __importDefault(require("./routes/loyalty-rewards.routes"));
const customer_feedback_routes_1 = __importDefault(require("./routes/customer-feedback.routes"));
const marketing_hub_routes_1 = __importDefault(require("./routes/marketing-hub.routes"));
const marketing_campaign_routes_1 = __importDefault(require("./routes/marketing-campaign.routes"));
const marketing_template_routes_1 = __importDefault(require("./routes/marketing-template.routes"));
const promotional_discount_routes_1 = __importDefault(require("./routes/promotional-discount.routes"));
const ai_assistant_routes_1 = __importDefault(require("./routes/ai-assistant.routes"));
const forecasting_routes_1 = __importDefault(require("./routes/forecasting.routes"));
const predictive_inventory_routes_1 = __importDefault(require("./routes/predictive-inventory.routes"));
const menu_analysis_routes_1 = __importDefault(require("./routes/menu-analysis.routes"));
const workflow_automation_routes_1 = __importDefault(require("./routes/workflow-automation.routes"));
const cash_shifts_routes_1 = __importDefault(require("./routes/cash-shifts.routes"));
const cash_reconciliation_routes_1 = __importDefault(require("./routes/cash-reconciliation.routes"));
const expenses_routes_1 = __importDefault(require("./routes/expenses.routes"));
const payables_routes_1 = __importDefault(require("./routes/payables.routes"));
const taxes_routes_1 = __importDefault(require("./routes/taxes.routes"));
const adjustments_routes_1 = __importDefault(require("./routes/adjustments.routes"));
const finance_hub_routes_1 = __importDefault(require("./routes/finance-hub.routes"));
const pos_terminal_routes_1 = __importDefault(require("./routes/pos-terminal.routes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 8000;
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
app.use('/api/v1/system', system_routes_1.default);
app.use('/api/v1/tenants', tenant_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/branches', branch_routes_1.default);
app.use('/api/v1/business', business_routes_1.default);
// 2. Menu Sub-modules & Nested Endpoints (Prioritized over /api/v1/menu)
app.use('/api/v1/menu/items', menu_item_routes_1.default);
app.use('/api/v1/menu/modifiers', modifier_routes_1.default);
app.use('/api/v1/menu/combos', combo_routes_1.default);
app.use('/api/v1/menu/pricing', pricing_routes_1.default);
app.use('/api/v1/menu/availability', availability_routes_1.default);
app.use('/api/v1/menu/recipes/units', unit_conversion_routes_1.default);
app.use('/api/v1/menu/recipes', recipe_routes_1.default);
app.use('/api/v1/menu', menu_routes_1.default);
// 3. Inventory Sub-modules, WMS, Topology & Fleet (Prioritized over /api/v1/inventory)
app.use('/api/v1/inventory/locations', inventory_locations_routes_1.default);
app.use('/api/v1/inventory/warehouse-locations', warehouse_location_routes_1.default);
app.use('/api/v1/inventory/transfers/fleet', logistics_fleet_routes_1.default);
app.use('/api/v1/inventory/transfers', stock_transfer_routes_1.default);
app.use('/api/v1/inventory/items', inventory_item_routes_1.default);
app.use('/api/v1/inventory/movements', stock_movement_routes_1.default);
app.use('/api/v1/inventory/counts', stock_count_routes_1.default);
app.use('/api/v1/inventory/batches', inventory_batch_routes_1.default);
app.use('/api/v1/inventory/reorder', inventory_reorder_routes_1.default);
app.use('/api/v1/inventory/waste', waste_log_routes_1.default);
app.use('/api/v1/inventory', inventory_routes_1.default);
// 4. Purchasing & Supplier Supply Chain
app.use('/api/v1/purchasing/requests', purchase_request_routes_1.default);
app.use('/api/v1/purchasing/orders', purchase_order_routes_1.default);
app.use('/api/v1/purchasing/receiving', goods_received_routes_1.default);
app.use('/api/v1/purchasing/invoices', supplier_invoice_routes_1.default);
app.use('/api/v1/purchasing/returns', supplier_return_routes_1.default);
app.use('/api/v1/suppliers', supplier_routes_1.default);
// 5. Hospitality, Dining, Tables & Kitchen KDS
app.use('/api/v1/restaurant/tables', restaurant_table_routes_1.default);
app.use('/api/v1/tables', table_routes_1.default);
app.use('/api/v1/reservations', reservation_routes_1.default);
app.use('/api/v1/waitlist', waitlist_routes_1.default);
app.use('/api/v1/kitchen', kitchen_routes_1.default);
// 6. Orders, Dispatch & Last-Mile Delivery
app.use('/api/v1/delivery', delivery_routes_1.default);
app.use('/api/v1/orders', order_routes_1.default);
// 7. Payments, M-Pesa & Cash Management
app.use('/api/v1/payments/reconciliation', payment_reconciliation_routes_1.default);
app.use('/api/v1/payments/mpesa', mpesa_routes_1.default);
app.use('/api/v1/payments/refunds', refund_routes_1.default);
app.use('/api/v1/payments', payment_routes_1.default);
app.use('/api/v1/cash-management/drawers', cash_drawer_routes_1.default);
app.use('/api/v1/cash-management/shifts', cash_shifts_routes_1.default);
app.use('/api/v1/cash-management/reconciliation', cash_reconciliation_routes_1.default);
app.use('/api/v1/finance', finance_hub_routes_1.default);
app.use('/api/v1/finance/expenses', expenses_routes_1.default);
app.use('/api/v1/finance/payables', payables_routes_1.default);
app.use('/api/v1/finance/taxes', taxes_routes_1.default);
app.use('/api/v1/finance/adjustments', adjustments_routes_1.default);
// 8. Analytics & Real-Time Events
app.use('/api/v1/analytics', analytics_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
// 9. Human Capital, RBAC Clearances & Staff Management
app.use('/api/v1/staff/roles', role_routes_1.default);
app.use('/api/v1/staff', staff_routes_1.default);
app.use('/api/v1/staff/schedules', schedule_routes_1.default);
app.use('/api/v1/staff/attendance', attendance_routes_1.default);
app.use('/api/v1/staff/handover', handover_routes_1.default);
app.use('/api/v1/staff/cashier-assignments', cashier_assignment_routes_1.default);
app.use('/api/v1/staff/performance', performance_routes_1.default);
// 10 . Settings, Financials & Service Models, Receipts & Printers, Kitchen Configurations
app.use('/api/v1/settings/financial', financial_routes_1.default);
app.use('/api/v1/settings/service-models', service_model_routes_1.default);
app.use('/api/v1/settings/receipts', receipt_routes_1.default);
app.use('/api/v1/settings/printers', printer_routes_1.default);
app.use('/api/v1/settings/kitchen', kitchen_settings_routes_1.default);
app.use('/api/v1/settings/integrations/payments', payment_integration_routes_1.default);
app.use('/api/v1/settings/integrations/messaging', messaging_integration_routes_1.default);
app.use('/api/v1/settings/integrations/orders', order_integration_routes_1.default);
app.use('/api/v1/settings/audit-logs', audit_log_routes_1.default);
app.use('/api/v1/settings/offline', offline_settings_routes_1.default);
app.use('/api/v1/settings/devices', device_routes_1.default);
app.use('/api/v1/settings/billing', billing_routes_1.default);
app.use('/api/v1/settings/security', security_settings_routes_1.default);
app.use('/api/v1/help', help_routes_1.default);
app.use('/api/v1/reports/sales', sales_report_routes_1.default);
app.use('/api/v1/reports/products', product_report_routes_1.default);
app.use('/api/v1/reports/payments', payment_report_routes_1.default);
app.use('/api/v1/reports/inventory', inventory_report_routes_1.default);
app.use('/api/v1/reports/food-costing', food_costing_report_routes_1.default);
app.use('/api/v1/reports/performance', performance_report_routes_1.default);
app.use('/api/v1/reports/builder', custom_report_builder_routes_1.default);
app.use('/api/v1/reports/saved', saved_reports_routes_1.default);
app.use('/api/v1/reports/exports', data_exports_routes_1.default);
app.use('/api/v1/reports', reports_routes_1.default);
// 11. Customer Growth and Loyalty
app.use('/api/v1/customers/feedback', customer_feedback_routes_1.default);
app.use('/api/v1/customers', customer_routes_1.default);
app.use('/api/v1/loyalty/transactions', loyalty_transactions_routes_1.default);
app.use('/api/v1/loyalty/rewards', loyalty_rewards_routes_1.default);
app.use('/api/v1/loyalty', loyalty_routes_1.default);
// 12 POS Terminal Context, CRM Lookup & Promo Validation, marketing/CRM modules 
app.use('/api/v1/pos', pos_terminal_routes_1.default);
app.use('/api/v1/marketing/promotions', promotional_discount_routes_1.default);
app.use('/api/v1/marketing/templates', marketing_template_routes_1.default);
app.use('/api/v1/marketing/hub', marketing_hub_routes_1.default);
app.use('/api/v1/marketing/campaigns', marketing_campaign_routes_1.default);
// 13. AI Assistants
app.use('/api/v1/automations', workflow_automation_routes_1.default);
app.use('/api/v1/ai-assistant/menu-analysis', menu_analysis_routes_1.default);
app.use('/api/v1/ai-assistant/inventory', predictive_inventory_routes_1.default);
app.use('/api/v1/ai-assistant/forecasting', forecasting_routes_1.default);
app.use('/api/v1/ai-assistant', ai_assistant_routes_1.default);
/* ==========================================================================
   GLOBAL ERROR HANDLING & SERVER LIFECYCLE
   ========================================================================== */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });
});
app.listen(port, () => {
    console.log(`[server]: Servora API is running at http://localhost:${port}`);
});
exports.default = app;
