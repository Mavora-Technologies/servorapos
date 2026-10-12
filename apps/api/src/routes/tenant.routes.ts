import { Router } from 'express';
import { createTenant } from '../controllers/tenant.controller';

const router = Router();

router.post('/onboard', createTenant);

export default router;