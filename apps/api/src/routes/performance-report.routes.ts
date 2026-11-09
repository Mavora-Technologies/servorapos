import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPerformanceReport,
  exportPerformanceReport,
} from '../controllers/performance-report.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPerformanceReport);
router.get('/export', exportPerformanceReport);

export default router;