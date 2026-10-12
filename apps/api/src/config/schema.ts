import { pgTable, serial, varchar, text, boolean, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
// Tenants Table (Restaurant Businesses)
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users Table (Platform & Restaurant Staff)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id), // Nullable for Platform Super Admins[cite: 2]
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const menuCategories = pgTable('menu_categories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(), // Strict tenant isolation[cite: 12]
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(), // Strict tenant isolation[cite: 12]
  categoryId: integer('category_id').references(() => menuCategories.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }), // Unique SKU/internal code[cite: 12]
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(), // Decimal-safe monetary value[cite: 12]
  isAvailable: boolean('is_available').default(true).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  orderType: varchar('order_type', { length: 50 }).notNull(), // Dine-In, Takeaway, Delivery
  status: varchar('status', { length: 50 }).default('Draft').notNull(), // Draft, Confirmed, Preparing, Ready, Completed, Cancelled
  paymentStatus: varchar('payment_status', { length: 50 }).default('Pending').notNull(), // Pending, Paid, Refunded
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 12, scale: 2 }).notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  menuItemId: integer('menu_item_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  category: varchar('category', { length: 100 }).notNull(), // e.g. Ingredients, Beverages, Packaging
  unit: varchar('unit', { length: 50 }).notNull(), // e.g. kg, grams, litres, units
  currentStock: decimal('current_stock', { precision: 12, scale: 2 }).default('0').notNull(),
  minThreshold: decimal('min_threshold', { precision: 12, scale: 2 }).default('0').notNull(),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // e.g. PURCHASE, ADJUSTMENT, USAGE, WASTE
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const diningAreas = pgTable('dining_areas', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const restaurantTables = pgTable('restaurant_tables', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  areaId: integer('area_id').references(() => diningAreas.id).notNull(),
  tableLabel: varchar('table_label', { length: 50 }).notNull(),
  capacity: integer('capacity').notNull(),
  status: varchar('status', { length: 50 }).default('Available').notNull(), // Available, Occupied, Reserved, Cleaning
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  partySize: integer('party_size').notNull(),
  reservationDate: timestamp('reservation_date').notNull(),
  expectedDuration: integer('expected_duration').default(120).notNull(), // Duration in minutes
  tableId: integer('table_id').references(() => restaurantTables.id), // Optional explicit table assignment
  status: varchar('status', { length: 50 }).default('Pending').notNull(), // Pending, Confirmed, Checked-In, Completed, Cancelled, No-Show
  specialRequests: text('special_requests'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const waitlistEntries = pgTable('waitlist_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  partySize: integer('party_size').notNull(),
  quotedWaitTime: integer('quoted_wait_time').notNull(), // Estimated wait in minutes
  status: varchar('status', { length: 50 }).default('Waiting').notNull(), // Waiting, Notified, Seated, Cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deliveryAssignments = pgTable('delivery_assignments', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  provider: varchar('provider', { length: 100 }).default('In-House').notNull(), // e.g., In-House, Uber Direct, Bolt Delivery, Little Cab
  driverName: varchar('driver_name', { length: 255 }).notNull(),
  driverPhone: varchar('driver_phone', { length: 50 }),
  trackingUrl: varchar('tracking_url', { length: 500 }),
  deliveryFee: decimal('delivery_fee', { precision: 12, scale: 2 }).default('0').notNull(),
  dispatchedAt: timestamp('dispatched_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
});
