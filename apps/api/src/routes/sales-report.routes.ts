import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getSalesReport, exportSalesReport } from '../controllers/sales-report.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getSalesReport);
router.get('/export', exportSalesReport);

export default router;