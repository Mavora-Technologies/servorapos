// apps/api/src/routes/notification.routes.ts
import { Router } from 'express';
import { getNotifications, patchNotificationRead, patchReadAll } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/read-all', patchReadAll);
router.patch('/:id/read', patchNotificationRead);

export default router;