import { Router } from 'express';
import { authMiddleware } from '@shared/middleware';
import { ChallengeController } from '../controllers/challenge.controller.ts';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /challenges/create - Create new challenge and match with opponent
router.post('/create', ChallengeController.createChallenge);

// POST /challenges/:id/accept - Accept pending challenge
router.post('/:id/accept', ChallengeController.acceptChallenge);

// POST /challenges/:id/submit - Submit challenge answers
router.post('/:id/submit', ChallengeController.submitChallenge);

// GET /challenges/history - Get user's challenge history
router.get('/history', ChallengeController.getChallengeHistory);

// GET /challenges/leaderboard/:topicId - Get leaderboard for topic
router.get('/leaderboard/:topicId', ChallengeController.getLeaderboard);

export default router;
