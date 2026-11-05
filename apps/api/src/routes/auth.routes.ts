// apps/api/src/routes/auth.routes.ts
import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Ensure both 'login' and 'getMe' are valid functions
router.post('/login', login);
router.get('/me', requireAuth, getMe);

export default router;