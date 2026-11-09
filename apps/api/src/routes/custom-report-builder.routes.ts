import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getDatasetsMetadata,
  postPreviewReport,
  postSaveCustomReport,
  getSavedCustomReports,
  exportCustomReport,
} from '../controllers/custom-report-builder.controller';

const router = Router();
router.use(requireAuth);

router.get('/datasets', getDatasetsMetadata);
router.post('/preview', postPreviewReport);
router.post('/save', postSaveCustomReport);
router.get('/saved', getSavedCustomReports);
router.post('/export', exportCustomReport);

export default router;