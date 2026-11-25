// apps/api/src/middleware/rbac.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import {
  getEffectiveUserPermissions,
  getUserAuthorizedBranches,
} from '../services/role.service';

function extractRequestedBranchId(req: AuthRequest): number | null {
  const headerBranch = req.headers['x-branch-id'];
  if (typeof headerBranch === 'string' && /^\d+$/.test(headerBranch.trim())) {
    const parsed = parseInt(headerBranch.trim(), 10);
    if (parsed > 0) return parsed;
  }

  const queryBranch = req.query?.branchId;
  if (typeof queryBranch === 'string' && /^\d+$/.test(queryBranch.trim())) {
    const parsed = parseInt(queryBranch.trim(), 10);
    if (parsed > 0) return parsed;
  }

  return req.user?.defaultBranchId ?? null;
}

async function resolveAndValidateContext(
  req: AuthRequest,
  res: Response
): Promise<{
  isSuperBypass: boolean;
  effectivePermissions: string[];
  activeBranchId: number | null;
} | null> {
  const user = req.user;
  if (!user?.tenantId || !user?.userId) {
    res.status(401).json({
      status: 'error',
      message: 'Unauthorized session. Authentication is required.',
    });
    return null;
  }

  const activeBranchId = extractRequestedBranchId(req);

  // Full administrative bypass for tenant owners and super admins
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    res.locals.activeBranchId = activeBranchId;
    res.locals.effectivePermissions = ['*'];
    return {
      isSuperBypass: true,
      effectivePermissions: ['*'],
      activeBranchId,
    };
  }

  // Enforce multi-branch membership isolation when a branch context is specified
  if (activeBranchId !== null) {
    const allowedBranches = await getUserAuthorizedBranches(
      user.tenantId,
      user.userId,
      user.role
    );

    if (allowedBranches !== 'ALL' && !allowedBranches.includes(activeBranchId)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: you do not have operational clearance for the selected branch.',
      });
      return null;
    }
  }

  // Resolve live permissions from the database (respects branch-level role overrides)
  const effectivePermissions = await getEffectiveUserPermissions(
    user.tenantId,
    user.userId,
    user.role,
    activeBranchId
  );

  res.locals.activeBranchId = activeBranchId;
  res.locals.effectivePermissions = effectivePermissions;

  return {
    isSuperBypass: effectivePermissions.includes('*'),
    effectivePermissions,
    activeBranchId,
  };
}

/**
 * Enforces that the authenticated user holds AT LEAST ONE of the required permissions
 * (OR semantics), plus valid branch clearance for X-Branch-Id / branchId.
 */
export const requirePermission = (requiredPermission: string | string[]) => {
  const requiredList = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = await resolveAndValidateContext(req, res);
      if (!ctx) return;

      if (
        ctx.isSuperBypass ||
        requiredList.length === 0 ||
        requiredList.some((perm) => ctx.effectivePermissions.includes(perm))
      ) {
        next();
        return;
      }

      res.status(403).json({
        status: 'error',
        message: `Security clearance required: Access requires '${requiredList.join("' or '")}' authority.`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Authorization verification failed';
      res.status(500).json({ status: 'error', message });
    }
  };
};

/**
 * Enforces that the authenticated user holds ALL of the specified permissions (AND semantics).
 */
export const requireAllPermissions = (requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = await resolveAndValidateContext(req, res);
      if (!ctx) return;

      const missing = requiredPermissions.filter(
        (perm) => !ctx.effectivePermissions.includes(perm)
      );

      if (ctx.isSuperBypass || missing.length === 0) {
        next();
        return;
      }

      res.status(403).json({
        status: 'error',
        message: `Security clearance required: Missing '${missing.join("', '")}' authority.`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Authorization verification failed';
      res.status(500).json({ status: 'error', message });
    }
  };
};

/**
 * Enforces branch-level isolation without requiring a specific feature permission.
 */
export const requireBranchAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ctx = await resolveAndValidateContext(req, res);
    if (!ctx) return;
    next();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Branch access verification failed';
    res.status(500).json({ status: 'error', message });
  }
};