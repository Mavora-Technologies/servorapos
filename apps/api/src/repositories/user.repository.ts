// apps/api/src/repositories/user.repository.ts
import bcrypt from 'bcrypt';
import { db } from '../config/db';
import { users } from '../config/schema';
import { CreateStaffInput } from '../validators/user.validator';

export const createStaffUser = async (tenantId: number, data: CreateStaffInput) => {
  const passwordHash = await bcrypt.hash(data.password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      tenantId, // Tied to the logged-in admin's business
      defaultBranchId: data.branchId || null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role, // <-- Dynamic role assigned by the admin
      isActive: true,
    } as any)
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    });

  return newUser;
};