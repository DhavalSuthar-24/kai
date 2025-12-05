import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new RecommendationController();

router.post('/recommend', authMiddleware, controller.recommend);

export default router;
