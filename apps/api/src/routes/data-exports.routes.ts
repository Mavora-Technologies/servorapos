import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getDataExports,
  postRequestExport,
  downloadExportFile,
} from '../controllers/data-exports.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getDataExports);
router.post('/request', postRequestExport);
router.get('/:executionNumber/download', downloadExportFile);

export default router;