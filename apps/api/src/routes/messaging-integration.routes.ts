import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getMessagingSettings,
  postIntegration,
  putIntegration,
  deleteIntegration,
  postTestDispatch,
  postTemplate,
  putTemplate,
  deleteTemplate,
} from '../controllers/messaging-integration.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getMessagingSettings);
router.post('/gateways', postIntegration);
router.put('/gateways/:id', putIntegration);
router.delete('/gateways/:id', deleteIntegration);
router.post('/gateways/test-dispatch', postTestDispatch);

router.post('/templates', postTemplate);
router.put('/templates/:id', putTemplate);
router.delete('/templates/:id', deleteTemplate);

export default router;