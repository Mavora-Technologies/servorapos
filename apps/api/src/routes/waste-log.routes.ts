import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getWasteLogs, createWasteLog } from '../controllers/waste-log.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getWasteLogs);
router.post('/', createWasteLog);

export default router;