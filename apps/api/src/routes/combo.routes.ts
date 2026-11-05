// apps/api/src/routes/combo.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getCombos, createCombo, deleteCombo } from '../controllers/combo.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getCombos);
router.post('/', createCombo);
router.delete('/:id', deleteCombo);

export default router;