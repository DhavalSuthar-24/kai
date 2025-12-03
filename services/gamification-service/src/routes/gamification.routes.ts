import { Router } from 'express';
import { getLeaderboard, getSocialShare } from '../controllers/gamification.controller.ts';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/share/:userId', getSocialShare);

// Challenge Routes
import { createChallenge, joinChallenge, getChallenges, getMyChallenges } from '../controllers/challenge.controller.ts';
import { authMiddleware } from '@shared/index.ts';

router.post('/challenges', authMiddleware, createChallenge);
router.post('/challenges/:id/join', authMiddleware, joinChallenge);
router.get('/challenges', authMiddleware, getChallenges);
router.get('/challenges/my', authMiddleware, getMyChallenges);

// Achievement Routes
import { getAchievements, getMyAchievements } from '../controllers/gamification.controller.ts';

router.get('/achievements', authMiddleware, getAchievements);
router.get('/achievements/my', authMiddleware, getMyAchievements);

export default router;
