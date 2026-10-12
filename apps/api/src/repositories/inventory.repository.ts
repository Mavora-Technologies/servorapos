import { eq, and } from 'drizzle-orm';
import { db } from '../config/db';
import { inventoryItems, stockMovements } from '../config/schema';

export const getItemsByTenant = async (tenantId: number) => {
  return await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
};

export const createInventoryItemRecord = async (tenantId: number, data: {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  currentStock: string;
  minThreshold: string;
  costPrice: string;
}) => {
  const [newItem] = await db.insert(inventoryItems).values({
    tenantId,
    name: data.name,
    sku: data.sku,
    category: data.category,
    unit: data.unit,
    currentStock: data.currentStock,
    minThreshold: data.minThreshold,
    costPrice: data.costPrice,
  }).returning();
  return newItem;
};

export const adjustStockTransaction = async (tenantId: number, data: {
  itemId: number;
  adjustment: number;
  type: string;
  notes?: string;
}) => {
  return await db.transaction(async (tx) => {
    const [item] = await tx.select().from(inventoryItems).where(
      and(eq(inventoryItems.id, data.itemId), eq(inventoryItems.tenantId, tenantId))
    );
    if (!item) throw new Error('Inventory item not found or unauthorized');

    const newStock = parseFloat(item.currentStock) + data.adjustment;
    if (newStock < 0) throw new Error('Stock balance cannot fall below zero');

    // Update current stock balance
    const [updatedItem] = await tx.update(inventoryItems)
      .set({ currentStock: newStock.toString(), updatedAt: new Date() })
      .where(eq(inventoryItems.id, data.itemId))
      .returning();

    // Create traceable stock movement record
    await tx.insert(stockMovements).values({
      tenantId,
      inventoryItemId: data.itemId,
      type: data.type,
      quantity: data.adjustment.toString(),
      notes: data.notes,
    });

    return updatedItem;
  });
};