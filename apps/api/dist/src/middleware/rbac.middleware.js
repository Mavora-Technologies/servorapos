"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBranchAccess = exports.requireAllPermissions = exports.requirePermission = void 0;
const role_service_1 = require("../services/role.service");
function extractRequestedBranchId(req) {
    const headerBranch = req.headers['x-branch-id'];
    if (typeof headerBranch === 'string' && /^\d+$/.test(headerBranch.trim())) {
        const parsed = parseInt(headerBranch.trim(), 10);
        if (parsed > 0)
            return parsed;
    }
    const queryBranch = req.query?.branchId;
    if (typeof queryBranch === 'string' && /^\d+$/.test(queryBranch.trim())) {
        const parsed = parseInt(queryBranch.trim(), 10);
        if (parsed > 0)
            return parsed;
    }
    return req.user?.defaultBranchId ?? null;
}
async function resolveAndValidateContext(req, res) {
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
        const allowedBranches = await (0, role_service_1.getUserAuthorizedBranches)(user.tenantId, user.userId, user.role);
        if (allowedBranches !== 'ALL' && !allowedBranches.includes(activeBranchId)) {
            res.status(403).json({
                status: 'error',
                message: 'Access denied: you do not have operational clearance for the selected branch.',
            });
            return null;
        }
    }
    // Resolve live permissions from the database (respects branch-level role overrides)
    const effectivePermissions = await (0, role_service_1.getEffectiveUserPermissions)(user.tenantId, user.userId, user.role, activeBranchId);
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
const requirePermission = (requiredPermission) => {
    const requiredList = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];
    return async (req, res, next) => {
        try {
            const ctx = await resolveAndValidateContext(req, res);
            if (!ctx)
                return;
            if (ctx.isSuperBypass ||
                requiredList.length === 0 ||
                requiredList.some((perm) => ctx.effectivePermissions.includes(perm))) {
                next();
                return;
            }
            res.status(403).json({
                status: 'error',
                message: `Security clearance required: Access requires '${requiredList.join("' or '")}' authority.`,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Authorization verification failed';
            res.status(500).json({ status: 'error', message });
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Enforces that the authenticated user holds ALL of the specified permissions (AND semantics).
 */
const requireAllPermissions = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const ctx = await resolveAndValidateContext(req, res);
            if (!ctx)
                return;
            const missing = requiredPermissions.filter((perm) => !ctx.effectivePermissions.includes(perm));
            if (ctx.isSuperBypass || missing.length === 0) {
                next();
                return;
            }
            res.status(403).json({
                status: 'error',
                message: `Security clearance required: Missing '${missing.join("', '")}' authority.`,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Authorization verification failed';
            res.status(500).json({ status: 'error', message });
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
/**
 * Enforces branch-level isolation without requiring a specific feature permission.
 */
const requireBranchAccess = async (req, res, next) => {
    try {
        const ctx = await resolveAndValidateContext(req, res);
        if (!ctx)
            return;
        next();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Branch access verification failed';
        res.status(500).json({ status: 'error', message });
    }
};
exports.requireBranchAccess = requireBranchAccess;
