import { Router } from 'express';
import { authMiddleware } from '@shared/middleware';
import { MockTestController } from '../controllers/mock-test.controller.ts';

const router =Router();

// All routes require authentication
router.use(authMiddleware);

// POST /mock-tests/create - Create new mock test
router.post('/create', MockTestController.createTest);

// POST /mock-tests/:id/submit - Submit test answers
router.post('/:id/submit', MockTestController.submitTest);

// POST /mock-tests/:id/violation - Record anti-cheat violation
router.post('/:id/violation', MockTestController.recordViolation);

// GET /mock-tests/leaderboard/:topicId - Get leaderboard
router.get('/leaderboard/:topicId', MockTestController.getLeaderboard);

// POST /mock-tests/results/:resultId/share - Generate shareable result
router.post('/results/:resultId/share', MockTestController.shareResult);

// GET /mock-tests/shared/:shareId - Get shared result (public)
router.get('/shared/:shareId', MockTestController.getSharedResult);

// GET /mock-tests/analytics/user - Get user analytics
router.get('/analytics/user', MockTestController.getUserAnalytics);

// GET /mock-tests/analytics/topic/:topicId - Get topic analytics
router.get('/analytics/topic/:topicId', MockTestController.getTopicAnalytics);

// GET /mock-tests/analytics/compare/:userId - Compare performance
router.get('/analytics/compare/:userId', MockTestController.comparePerformance);

export default router;
