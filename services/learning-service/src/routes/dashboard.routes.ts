import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new DashboardController();

router.get('/analytics', authMiddleware, controller.getAnalytics);

export default router;
