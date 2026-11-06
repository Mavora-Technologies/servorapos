// apps/api/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../config/db';
import { users, roles } from '../config/schema';
import { LoginInput } from '../validators/auth.validator';

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'], // Updated from OWNER to ADMIN
  MANAGER: [
    'dashboard.view', 'pos.access', 'pos.checkout', 'pos.void', 'pos.discount',
    'orders.view', 'tables.view', 'tables.manage', 'reservations.view', 'reservations.manage', 'delivery.view',
    'kitchen.view', 'kitchen.manage', 'menu.view', 'menu.manage', 'recipes.view',
    'inventory.view', 'inventory.adjust', 'inventory.manage', 'inventory.count',
    'suppliers.view', 'purchasing.view', 'purchasing.manage', 'purchasing.receive',
    'payments.view', 'payments.reconcile', 'cash.view', 'cash.reconcile', 'refunds.view',
    'customers.view', 'loyalty.view', 'loyalty.manage', 'reports.view', 'staff.view', 'staff.manage',
    'notifications.view', 'help.view',
  ],
  CASHIER: [
    'dashboard.view', 'pos.access', 'pos.checkout', 'orders.view',
    'tables.view', 'reservations.view', 'payments.view', 'cash.view', 'customers.view', 'loyalty.view', 'help.view',
  ],
  WAITER: [
    'pos.access', 'orders.view', 'tables.view', 'reservations.view', 'kitchen.view', 'help.view',
  ],
  CHEF: [
    'kitchen.view', 'kitchen.manage', 'recipes.view', 'inventory.view', 'menu.view', 'help.view',
  ],
  STOREKEEPER: [
    'inventory.view', 'inventory.adjust', 'inventory.manage', 'inventory.count',
    'suppliers.view', 'purchasing.view', 'purchasing.receive', 'help.view',
  ],
  ACCOUNTANT: [
    'dashboard.view', 'orders.view', 'inventory.view', 'suppliers.view', 'purchasing.view',
    'payments.view', 'payments.reconcile', 'cash.view', 'cash.reconcile', 'refunds.view',
    'finance.view', 'finance.manage', 'finance.adjust', 'reports.view', 'reports.export', 'help.view',
  ],
};

export const loginUser = async (data: LoginInput) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  let userPermissions: string[] = [];

  // Updated from OWNER to ADMIN
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    userPermissions = ['*'];
  } else {
    const [matchedRole] = await db
      .select({ permissions: roles.permissions })
      .from(roles)
      .where(
        and(
          eq(roles.slug, user.role),
          user.tenantId
            ? or(eq(roles.tenantId, user.tenantId), eq(roles.isSystemRole, true))
            : eq(roles.isSystemRole, true)
        )
      )
      .limit(1);

    userPermissions =
      matchedRole?.permissions && matchedRole.permissions.length > 0
        ? matchedRole.permissions
        : DEFAULT_ROLE_PERMISSIONS[user.role] ?? ['pos.access', 'help.view'];
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const secret = process.env.JWT_SECRET || 'servora-super-secret-key-2026';
  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: userPermissions,
      defaultBranchId: user.defaultBranchId,
    },
    secret,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: userPermissions,
      tenantId: user.tenantId,
      defaultBranchId: user.defaultBranchId,
    },
  };
};