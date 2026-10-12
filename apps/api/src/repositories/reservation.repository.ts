import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { reservations, restaurantTables } from '../config/schema';

export const fetchReservations = async (tenantId: number) => {
  return await db.select({
    id: reservations.id,
    customerName: reservations.customerName,
    customerPhone: reservations.customerPhone,
    partySize: reservations.partySize,
    reservationDate: reservations.reservationDate,
    status: reservations.status,
    specialRequests: reservations.specialRequests,
    tableLabel: restaurantTables.tableLabel,
  })
  .from(reservations)
  .leftJoin(restaurantTables, eq(reservations.tableId, restaurantTables.id))
  .where(eq(reservations.tenantId, tenantId))
  .orderBy(desc(reservations.reservationDate));
};

export const createReservation = async (tenantId: number, data: any) => {
  const [reservation] = await db.insert(reservations).values({
    tenantId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    partySize: data.partySize,
    reservationDate: new Date(data.reservationDate),
    tableId: data.tableId || null,
    specialRequests: data.specialRequests,
  }).returning();
  return reservation;
};

export const updateReservationStatus = async (tenantId: number, reservationId: number, status: string) => {
  const [updated] = await db.update(reservations)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(reservations.id, reservationId), eq(reservations.tenantId, tenantId)))
    .returning();
  return updated;
};