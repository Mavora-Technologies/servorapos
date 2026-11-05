import { Router } from 'express';
import { onboardTenant } from '../controllers/tenant.controller';

const router = Router();

router.post('/onboard', onboardTenant);

export default router;