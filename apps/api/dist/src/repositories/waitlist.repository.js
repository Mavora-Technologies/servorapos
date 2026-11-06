"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWaitlistStatus = exports.createWaitlistEntry = exports.fetchWaitlist = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const fetchWaitlist = async (tenantId) => {
    return await db_1.db.select().from(schema_1.waitlistEntries)
        .where((0, drizzle_orm_1.eq)(schema_1.waitlistEntries.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.waitlistEntries.createdAt));
};
exports.fetchWaitlist = fetchWaitlist;
const createWaitlistEntry = async (tenantId, data) => {
    const [entry] = await db_1.db.insert(schema_1.waitlistEntries).values({
        tenantId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        partySize: data.partySize,
        quotedWaitTime: data.quotedWaitTime,
        notes: data.notes,
    }).returning();
    return entry;
};
exports.createWaitlistEntry = createWaitlistEntry;
const updateWaitlistStatus = async (tenantId, entryId, status) => {
    const [updated] = await db_1.db.update(schema_1.waitlistEntries)
        .set({ status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waitlistEntries.id, entryId), (0, drizzle_orm_1.eq)(schema_1.waitlistEntries.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.updateWaitlistStatus = updateWaitlistStatus;
