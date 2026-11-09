import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getAuditLogs,
  getAuditLogDetail,
  getAuditTelemetry,
  getFilterOptions,
  exportAuditLogs,
} from '../controllers/audit-log.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getAuditLogs);
router.get('/telemetry', getAuditTelemetry);
router.get('/filter-options', getFilterOptions);
router.get('/export', exportAuditLogs);
router.get('/:id', getAuditLogDetail);

export default router;