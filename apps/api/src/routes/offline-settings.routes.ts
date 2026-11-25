// apps/api/src/routes/offline-settings.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSettings,
  putSettings,
  postSyncOfflineBatch,
} from '../controllers/offline-settings.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getSettings);
router.put('/', putSettings);
router.post('/sync', postSyncOfflineBatch);

export default router;