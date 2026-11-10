"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = void 0;
const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        const userPermissions = req.user?.permissions || [];
        // Wildcard authority (Admins / Business Owners)
        if (userPermissions.includes('*')) {
            return next();
        }
        if (!userPermissions.includes(requiredPermission)) {
            res.status(403).json({
                status: 'error',
                message: `Security clearance revoked: Access requires '${requiredPermission}' authority.`,
            });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
