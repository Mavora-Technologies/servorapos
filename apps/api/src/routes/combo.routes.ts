// apps/api/src/routes/combo.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getCombos,
  createCombo,
  updateCombo,
  deleteCombo,
} from '../controllers/combo.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getCombos);
router.post('/', createCombo);
router.put('/:id', updateCombo);
router.delete('/:id', deleteCombo);

export default router;