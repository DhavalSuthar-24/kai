import { Router } from 'express';
import { authMiddleware } from '@shared/index';
// import { getWeeklyInsights, triggerWeeklyInsights } from '../controllers/memory.controller';

const router = Router();

// router.get('/weekly', authMiddleware, getWeeklyInsights);
// router.post('/weekly/trigger', authMiddleware, triggerWeeklyInsights);

export default router;
