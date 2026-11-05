// apps/api/src/routes/modifier.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getModifiers, createModifierGroup, deleteModifierGroup } from '../controllers/modifier.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getModifiers);
router.post('/', createModifierGroup);
router.delete('/:id', deleteModifierGroup);

export default router;