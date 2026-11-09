import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSecurityOverview,
  putSecuritySettings,
  postRevokeSession,
  postRevokeAllSessions,
} from '../controllers/security-settings.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getSecurityOverview);
router.put('/', putSecuritySettings);
router.post('/sessions/revoke', postRevokeSession);
router.post('/sessions/revoke-all', postRevokeAllSessions);

export default router;