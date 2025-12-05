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

export default router;
