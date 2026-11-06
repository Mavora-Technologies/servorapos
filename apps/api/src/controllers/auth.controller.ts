// apps/api/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../config/db';
import { users, tenants, branches, roles } from '../config/schema'; // <-- Added roles here
import { loginSchema } from '../validators/auth.validator';
import { loginUser, DEFAULT_ROLE_PERMISSIONS } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await loginUser(validatedData);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    if (error.message === 'Invalid credentials' || error.message === 'Account is disabled') {
      res.status(401).json({ status: 'error', message: error.message });
      return;
    }

    console.error('[Auth Controller Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [userRecord] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        tenantId: users.tenantId,
        defaultBranchId: users.defaultBranchId,
        businessName: tenants.businessName,
        legalName: tenants.legalName,
        kraPin: tenants.kraPin,
        currency: tenants.currency,
        timezone: tenants.timezone,
        phone: tenants.phone,
        emailOfficial: tenants.email,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      res.status(404).json({ status: 'error', message: 'User profile not found' });
      return;
    }

    // Resolve dynamic permissions for the user's role
    let effectivePermissions: string[] = [];
    if (userRecord.role === 'SUPER_ADMIN' || userRecord.role === 'ADMIN') {
      effectivePermissions = ['*'];
    } else if (userRecord.tenantId) {
      const [roleRecord] = await db
        .select({ permissions: roles.permissions })
        .from(roles)
        .where(
          and(
            eq(roles.slug, userRecord.role),
            or(eq(roles.tenantId, userRecord.tenantId), eq(roles.isSystemRole, true))
          )
        )
        .limit(1);

      effectivePermissions =
        roleRecord?.permissions && roleRecord.permissions.length > 0
          ? roleRecord.permissions
          : DEFAULT_ROLE_PERMISSIONS[userRecord.role] ?? ['pos.access', 'help.view'];
    }

    // Resolve branch record
    let branchRecord: any = null;
    if (userRecord.tenantId) {
      const branchQuery = userRecord.defaultBranchId
        ? eq(branches.id, userRecord.defaultBranchId)
        : eq(branches.tenantId, userRecord.tenantId);

      const [foundBranch] = await db
        .select({
          id: branches.id,
          name: branches.name,
          code: branches.code,
          address: branches.address,
          phone: branches.phone,
          email: branches.email,
          kraPin: branches.kraPin,
          etimsBranchId: branches.etimsBranchId,
          etimsDeviceSerial: branches.etimsDeviceSerial,
          receiptFooter: branches.receiptFooter,
        })
        .from(branches)
        .where(branchQuery)
        .limit(1);

      branchRecord = foundBranch;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: userRecord.id,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          fullName: `${userRecord.firstName} ${userRecord.lastName}`.trim(),
          email: userRecord.email,
          role: userRecord.role,
          permissions: effectivePermissions,
        },
        business: {
          id: userRecord.tenantId,
          name: userRecord.businessName,
          legalName: userRecord.legalName || userRecord.businessName,
          kraPin: branchRecord?.kraPin || userRecord.kraPin || '',
          currency: userRecord.currency || 'KES',
          timezone: userRecord.timezone,
          phone: userRecord.phone,
          email: userRecord.emailOfficial,
        },
        branch: {
          id: branchRecord?.id ?? 1,
          name: branchRecord?.name ?? 'Headquarters',
          code: branchRecord?.code ?? 'HQ',
          address: branchRecord?.address ?? '',
          phone: branchRecord?.phone ?? '',
          kraPin: branchRecord?.kraPin ?? '',
          etimsBranchId: branchRecord?.etimsBranchId ?? '00',
          etimsDeviceSerial: branchRecord?.etimsDeviceSerial ?? 'CU-PENDING-INIT',
          receiptFooter: branchRecord?.receiptFooter ?? 'Thank you for your business. Karibu tena!',
        },
      },
    });
  } catch (error: any) {
    console.error('[Auth GetMe Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};