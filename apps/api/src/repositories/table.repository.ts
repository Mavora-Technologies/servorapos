import { eq, and } from 'drizzle-orm';
import { db } from '../config/db';
import { diningAreas, restaurantTables } from '../config/schema';

export const getFloorPlan = async (tenantId: number) => {
  const areas = await db.select().from(diningAreas).where(eq(diningAreas.tenantId, tenantId));
  const tables = await db.select().from(restaurantTables).where(eq(restaurantTables.tenantId, tenantId));
  return { areas, tables };
};

export const createArea = async (tenantId: number, name: string) => {
  const [area] = await db.insert(diningAreas).values({ tenantId, name }).returning();
  return area;
};

export const createTable = async (tenantId: number, data: { areaId: number, tableLabel: string, capacity: number }) => {
  const [table] = await db.insert(restaurantTables).values({
    tenantId,
    areaId: data.areaId,
    tableLabel: data.tableLabel,
    capacity: data.capacity,
  }).returning();
  return table;
};

export const updateStatus = async (tenantId: number, tableId: number, status: string) => {
  const [table] = await db.update(restaurantTables)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.tenantId, tenantId)))
    .returning();
  return table;
};