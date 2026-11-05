// apps/api/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
    email: string;
    defaultBranchId?: number | null;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'servora-super-secret-key-2026';
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired session token' });
  }
};