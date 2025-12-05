import { Router } from 'express';
import { 
  getOverview, 
  getFlashcardStats, 
  getTopicProgress, 
  getStudyTime, 
  getReviewAccuracy,
  AnalyticsController 
} from '../controllers/analytics.controller.ts';
import { authMiddleware } from '@shared/index.ts';

const router = Router();

router.get('/overview', authMiddleware, getOverview);
router.get('/flashcards', authMiddleware, getFlashcardStats);
router.get('/topics', authMiddleware, getTopicProgress);
router.get('/study-time', authMiddleware, getStudyTime);
const controller = new AnalyticsController();
router.get('/accuracy', authMiddleware, getReviewAccuracy);
router.get('/dashboard/advanced', authMiddleware, (req, res, next) => controller.getAdvancedDashboard(req, res).catch(next));

export default router;
