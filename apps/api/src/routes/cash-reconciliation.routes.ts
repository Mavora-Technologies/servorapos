import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getReconciliationTelemetry,
  getReconciliationAuditList,
  postAuditResolution,
} from '../controllers/cash-reconciliation.controller';

const router = Router();
router.use(requireAuth);

router.get('/telemetry', getReconciliationTelemetry);
router.get('/audit-list', getReconciliationAuditList);
router.post('/sign-off', postAuditResolution);

export default router;