import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getReportCatalog,
  postRunReport,
  getExecutions,
  postSchedule,
  deleteSchedule,
} from '../controllers/reports.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getReportCatalog);
router.post('/run', postRunReport);
router.get('/executions', getExecutions);
router.post('/schedules', postSchedule);
router.delete('/schedules/:id', deleteSchedule);

export default router;