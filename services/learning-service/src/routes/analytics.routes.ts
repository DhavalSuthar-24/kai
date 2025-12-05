import { Router } from 'express';
import { 
  getOverview, 
  getFlashcardStats, 
  getTopicProgress, 
  getStudyTime, 
  getReviewAccuracy
} from '../controllers/analytics.controller.ts';
import { authMiddleware } from '@shared/index.ts';

const router = Router();

router.get('/overview', authMiddleware, getOverview);
router.get('/flashcards', authMiddleware, getFlashcardStats);
router.get('/topics', authMiddleware, getTopicProgress);
router.get('/study-time', authMiddleware, getStudyTime);
router.get('/accuracy', authMiddleware, getReviewAccuracy);

export default router;
