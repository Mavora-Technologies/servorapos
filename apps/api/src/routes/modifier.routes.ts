// apps/api/src/routes/modifier.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getModifiers,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
} from '../controllers/modifier.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getModifiers);
router.post('/', createModifierGroup);
router.put('/:id', updateModifierGroup);
router.patch('/:id', updateModifierGroup);
router.delete('/:id', deleteModifierGroup);

export default router;