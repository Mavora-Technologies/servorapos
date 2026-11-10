import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getAiSessions,
  getSessionMessages,
  postPromptCopilot,
} from '../controllers/ai-assistant.controller';

const router = Router();
router.use(requireAuth);

router.get('/sessions', getAiSessions);
router.get('/sessions/:sessionId/messages', getSessionMessages);
router.post('/prompt', postPromptCopilot);

export default router;