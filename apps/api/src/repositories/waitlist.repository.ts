import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { waitlistEntries } from '../config/schema';

export const fetchWaitlist = async (tenantId: number) => {
  return await db.select().from(waitlistEntries)
    .where(eq(waitlistEntries.tenantId, tenantId))
    .orderBy(desc(waitlistEntries.createdAt));
};

export const createWaitlistEntry = async (tenantId: number, data: any) => {
  const [entry] = await db.insert(waitlistEntries).values({
    tenantId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    partySize: data.partySize,
    quotedWaitTime: data.quotedWaitTime,
    notes: data.notes,
  }).returning();
  return entry;
};

export const updateWaitlistStatus = async (tenantId: number, entryId: number, status: string) => {
  const [updated] = await db.update(waitlistEntries)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(waitlistEntries.id, entryId), eq(waitlistEntries.tenantId, tenantId)))
    .returning();
  return updated;
};