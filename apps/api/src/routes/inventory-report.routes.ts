import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getInventoryReport, exportInventoryReport } from '../controllers/inventory-report.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getInventoryReport);
router.get('/export', exportInventoryReport);

export default router;