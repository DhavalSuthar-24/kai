import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import { logScreenUsage } from '../controllers/screen-usage.controller';

const router = Router();

router.post('/', authMiddleware, logScreenUsage);

export default router;
