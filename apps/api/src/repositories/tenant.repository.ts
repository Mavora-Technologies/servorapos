import { db } from '../config/db';
import { tenants, users } from '../config/schema';

export const createTenantWithAdmin = async (
  businessName: string,
  adminData: { firstName: string; lastName: string; email: string; passwordHash: string }
) => {
  // Use a transaction to ensure atomic operations
  return await db.transaction(async (tx) => {
    const [newTenant] = await tx.insert(tenants).values({
      businessName,
    }).returning();

    const [newAdmin] = await tx.insert(users).values({
      tenantId: newTenant.id,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email: adminData.email,
      passwordHash: adminData.passwordHash,
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName
    });

    return { tenant: newTenant, admin: newAdmin };
  });
};