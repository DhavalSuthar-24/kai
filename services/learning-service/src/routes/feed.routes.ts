import { Router } from 'express';
import { authMiddleware } from '@shared/middleware';
import { FeedController } from '../controllers/feed.controller.ts';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /feed/interest - Get personalized interest-based feed
router.get('/interest', FeedController.getInterestFeed);

// GET /feed/general - Get general trending feed
router.get('/general', FeedController.getGeneralFeed);

// POST /feed/seen - Mark items as seen
router.post('/seen', FeedController.markAsSeen);

// POST /feed/feedback - Record user feedback
router.post('/feedback', FeedController.recordFeedback);

export default router;
