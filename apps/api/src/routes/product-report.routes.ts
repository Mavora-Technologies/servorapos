import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getProductReport, exportProductReport } from '../controllers/product-report.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getProductReport);
router.get('/export', exportProductReport);

export default router;