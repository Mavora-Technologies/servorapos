import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSavedReports,
  getSavedReport,
  patchSavedReport,
  deleteSavedReport,
  runSavedReportDirectly,
} from '../controllers/saved-reports.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getSavedReports);
router.get('/:id', getSavedReport);
router.patch('/:id', patchSavedReport);
router.delete('/:id', deleteSavedReport);
router.post('/:id/run', runSavedReportDirectly);

export default router;