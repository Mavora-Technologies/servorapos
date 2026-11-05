// apps/api/src/routes/unit-conversion.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getUnitConversions,
  createUnitConversion,
  deleteUnitConversion,
} from '../controllers/unit-conversion.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getUnitConversions);
router.post('/', createUnitConversion);
router.delete('/:id', deleteUnitConversion);

export default router;