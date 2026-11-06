import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { users, branches, roles } from '../config/schema';
import { CreateStaffInput, UpdateStaffInput } from '../validators/staff.validator';

export const listStaffByTenant = async (
  tenantId: number,
  filters?: {
    search?: string;
    branchId?: number;
    role?: string;
    isActive?: boolean;
  }
) => {
  const query = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      hasPin: sql<boolean>`CASE WHEN ${users.pinHash} IS NOT NULL THEN true ELSE false END`,
      defaultBranchId: users.defaultBranchId,
      branchName: branches.name,
      branchCode: branches.code,
    })
    .from(users)
    .leftJoin(branches, eq(users.defaultBranchId, branches.id))
    .where(
      and(
        eq(users.tenantId, tenantId),
        filters?.branchId ? eq(users.defaultBranchId, filters.branchId) : undefined,
        filters?.role ? eq(users.role, filters.role as any) : undefined,
        filters?.isActive !== undefined ? eq(users.isActive, filters.isActive) : undefined,
        filters?.search
          ? or(
              ilike(users.firstName, `%${filters.search}%`),
              ilike(users.lastName, `%${filters.search}%`),
              ilike(users.email, `%${filters.search}%`),
              ilike(users.phone, `%${filters.search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(users.createdAt));

  const staffMembers = await query;

  // Retrieve tenant-accessible custom or system roles
  const tenantRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      slug: roles.slug,
      permissions: roles.permissions,
      isSystemRole: roles.isSystemRole,
    })
    .from(roles)
    .where(or(eq(roles.tenantId, tenantId), eq(roles.isSystemRole, true)));

  return {
    staff: staffMembers,
    roles: tenantRoles,
  };
};

export const findStaffById = async (tenantId: number, staffId: number) => {
  const [staff] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      defaultBranchId: users.defaultBranchId,
      branchName: branches.name,
      hasPin: sql<boolean>`CASE WHEN ${users.pinHash} IS NOT NULL THEN true ELSE false END`,
    })
    .from(users)
    .leftJoin(branches, eq(users.defaultBranchId, branches.id))
    .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
    .limit(1);

  return staff || null;
};

export const createStaffMember = async (tenantId: number, input: CreateStaffInput) => {
  // Check for email collision across tenant ecosystem
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    throw new Error(`An account with email '${input.email}' already exists.`);
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(input.password, saltRounds);
  const pinHash = input.pin ? await bcrypt.hash(input.pin, saltRounds) : null;

  const [newUser] = await db
    .insert(users)
    .values({
      tenantId,
      defaultBranchId: input.defaultBranchId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      pinHash,
      role: input.role as any,
      isActive: true,
    })
    .returning({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      defaultBranchId: users.defaultBranchId,
      createdAt: users.createdAt,
    });

  return newUser;
};

export const updateStaffMember = async (
  tenantId: number,
  staffId: number,
  input: UpdateStaffInput
) => {
  const [existingStaff] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!existingStaff) {
    throw new Error('Employee record not found.');
  }

  // Handle unique email change checks
  if (input.email && input.email !== existingStaff.email) {
    const [emailCollision] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (emailCollision) {
      throw new Error(`Email address '${input.email}' is already in use.`);
    }
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.firstName !== undefined) updateData.firstName = input.firstName;
  if (input.lastName !== undefined) updateData.lastName = input.lastName;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.defaultBranchId !== undefined) updateData.defaultBranchId = input.defaultBranchId;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (input.password) {
    updateData.passwordHash = await bcrypt.hash(input.password, 10);
  }

  if (input.pin) {
    updateData.pinHash = await bcrypt.hash(input.pin, 10);
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
    .returning({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      defaultBranchId: users.defaultBranchId,
      updatedAt: users.updatedAt,
    });

  return updated;
};

export const setStaffPin = async (tenantId: number, staffId: number, pin: string) => {
  const pinHash = await bcrypt.hash(pin, 10);
  const [updated] = await db
    .update(users)
    .set({ pinHash, updatedAt: new Date() })
    .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
    .returning({ id: users.id });

  if (!updated) {
    throw new Error('Employee record not found.');
  }

  return { success: true, message: 'POS Quick PIN updated successfully.' };
};