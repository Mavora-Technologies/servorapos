import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getBusinessProfile, updateBusinessProfile } from '../controllers/business.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getBusinessProfile);
router.put('/', updateBusinessProfile);

export default router;