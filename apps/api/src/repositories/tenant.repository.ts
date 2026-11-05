import bcrypt from 'bcrypt';
import { db } from '../config/db';
import { tenants, users, branches } from '../config/schema';

export const createTenantWithAdmin = async (
  businessName: string,
  adminData: { firstName: string; lastName: string; email: string; password: string }
) => {
  return await db.transaction(async (tx) => {
    // 1. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);

    // 2. Insert Tenant
    const [newTenant] = await tx
      .insert(tenants)
      .values({
        businessName,
      })
      .returning();

    // 3. Create Default Primary Branch
    const [newBranch] = await tx
      .insert(branches)
      .values({
        tenantId: newTenant.id,
        name: `${businessName} Main Branch`,
        code: 'MAIN',
      })
      .returning();

    // 4. Insert Admin User with OWNER role matching schema enum
    const [newAdmin] = await tx
      .insert(users)
      .values({
        tenantId: newTenant.id,
        defaultBranchId: newBranch?.id || null,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email.toLowerCase().trim(),
        passwordHash,
        role: 'OWNER', // Explicitly assign OWNER
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    return { tenant: newTenant, admin: newAdmin, branch: newBranch };
  });
};