import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSettings,
  putSettings,
  postSimulateSync,
} from '../controllers/offline-settings.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getSettings);
router.put('/', putSettings);
router.post('/simulate-sync', postSimulateSync);

export default router;