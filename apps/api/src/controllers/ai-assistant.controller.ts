import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as aiRepo from '../repositories/ai-assistant.repository';
import { promptAiCopilotSchema, createAiSessionSchema } from '../validators/ai-assistant.validator';

export const getAiSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const sessions = await aiRepo.listTenantAiSessions(tenantId, userId);
    res.status(200).json({ status: 'success', data: sessions });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list copilot sessions' });
  }
};

export const getSessionMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const sessionId = parseInt(String(req.params.sessionId), 10);
    if (!tenantId || isNaN(sessionId)) {
      res.status(400).json({ status: 'error', message: 'Valid session ID required' });
      return;
    }

    const messages = await aiRepo.getSessionMessageHistory(tenantId, sessionId);
    res.status(200).json({ status: 'success', data: messages });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch conversation history' });
  }
};

export const postPromptCopilot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = promptAiCopilotSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await aiRepo.processCopilotInquiry(tenantId, userId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Copilot reasoning engine failed' });
  }
};