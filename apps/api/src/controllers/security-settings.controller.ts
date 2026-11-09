import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as securityRepo from '../repositories/security-settings.repository';
import {
  updateSecuritySettingsSchema,
  revokeSessionSchema,
} from '../validators/security-settings.validator';

export const getSecurityOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const [settings, sessions, telemetry] = await Promise.all([
      securityRepo.getOrCreateSecuritySettings(tenantId),
      securityRepo.listActiveSessions(tenantId),
      securityRepo.getSecurityTelemetry(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        settings,
        sessions,
        telemetry,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve security configuration' });
  }
};

export const putSecuritySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = updateSecuritySettingsSchema.parse(req.body);
    const updated = await securityRepo.updateSecuritySettings(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Security governance and authentication policies updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update security parameters' });
  }
};

export const postRevokeSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { sessionId } = revokeSessionSchema.parse(req.body);
    await securityRepo.revokeSession(tenantId, sessionId);

    res.status(200).json({
      status: 'success',
      message: 'Active session terminated and token revoked.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to revoke session' });
  }
};

export const postRevokeAllSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const revokedList = await securityRepo.revokeAllOtherSessions(tenantId, userId);

    res.status(200).json({
      status: 'success',
      message: `${revokedList.length} external session(s) revoked across all endpoints.`,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to terminate all sessions' });
  }
};