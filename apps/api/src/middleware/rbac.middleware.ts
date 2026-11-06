import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userPermissions = (req.user as any)?.permissions || [];

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