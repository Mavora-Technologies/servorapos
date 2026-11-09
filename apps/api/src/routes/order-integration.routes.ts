import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getOrderIntegrations,
  postOrderIntegration,
  putOrderIntegration,
  deleteOrderIntegration,
  postTestSync,
} from '../controllers/order-integration.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getOrderIntegrations);
router.post('/', postOrderIntegration);
router.put('/:id', putOrderIntegration);
router.delete('/:id', deleteOrderIntegration);
router.post('/test-sync', postTestSync);

export default router;