import { Router } from 'express';
import { authMiddleware } from '@shared/index.ts';
import { logScreenUsage } from '../controllers/screen-usage.controller.ts';

const router = Router();

router.post('/', authMiddleware, logScreenUsage);

export default router;
