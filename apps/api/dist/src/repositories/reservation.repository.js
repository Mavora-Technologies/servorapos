"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReservationStatus = exports.createReservation = exports.fetchReservations = void 0;
// apps/api/src/repositories/reservation.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const fetchReservations = async (tenantId) => {
    return await db_1.db.select({
        id: schema_1.reservations.id,
        customerName: schema_1.reservations.customerName,
        customerPhone: schema_1.reservations.customerPhone,
        partySize: schema_1.reservations.partySize,
        reservationDate: schema_1.reservations.reservationDate,
        status: schema_1.reservations.status,
        specialRequests: schema_1.reservations.specialRequests,
        tableLabel: schema_1.restaurantTables.tableLabel,
    })
        .from(schema_1.reservations)
        .leftJoin(schema_1.restaurantTables, (0, drizzle_orm_1.eq)(schema_1.reservations.tableId, schema_1.restaurantTables.id))
        .where((0, drizzle_orm_1.eq)(schema_1.reservations.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.reservations.reservationDate));
};
exports.fetchReservations = fetchReservations;
const createReservation = async (tenantId, data) => {
    const [reservation] = await db_1.db.insert(schema_1.reservations).values({
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
exports.createReservation = createReservation;
const updateReservationStatus = async (tenantId, reservationId, status) => {
    const [updated] = await db_1.db.update(schema_1.reservations)
        .set({ status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.id, reservationId), (0, drizzle_orm_1.eq)(schema_1.reservations.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.updateReservationStatus = updateReservationStatus;
