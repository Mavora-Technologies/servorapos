// apps/api/src/repositories/tenant.repository.ts
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

    // 4. Insert Admin User with ADMIN role matching schema enum
    const [insertedAdmin] = await tx
      .insert(users)
      .values({
        tenantId: newTenant.id,
        defaultBranchId: newBranch?.id || null,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email.toLowerCase().trim(),
        passwordHash,
        role: 'ADMIN', // Matches 'ADMIN' in userRoleEnum
        isActive: true,
      })
      .returning(); // Returns the full inserted user record, avoiding object mapping type mismatch

    // Shape the returned admin object precisely as needed
    const newAdmin = {
      id: insertedAdmin.id,
      email: insertedAdmin.email,
      firstName: insertedAdmin.firstName,
      lastName: insertedAdmin.lastName,
      role: insertedAdmin.role,
    };

    return { tenant: newTenant, admin: newAdmin, branch: newBranch };
  });
};