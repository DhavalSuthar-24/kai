import { Router } from 'express';
import { getLeaderboard, getSocialShare, getAchievements, getMyAchievements } from '../controllers/gamification.controller.ts';
import { createGoal, getGoals, getGoalProgress, updateGoal, deleteGoal } from '../controllers/goals.controller.ts';
import { requestFriend, acceptRequest, rejectRequest, listFriends, listPendingRequests, deleteFriend } from '../controllers/friends.controller.ts';
import { validateRequest, userGoalSchema } from '@shared/index.ts';

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
router.get('/achievements', getAchievements);
router.get('/my-achievements', authMiddleware, getMyAchievements);

// Goals Routes
router.post('/goals', authMiddleware, validateRequest(userGoalSchema), createGoal);
router.get('/goals', authMiddleware, getGoals);
router.get('/goals/progress', authMiddleware, getGoalProgress);
router.put('/goals/:id', authMiddleware, updateGoal);
router.delete('/goals/:id', authMiddleware, deleteGoal);

// Friends Routes
router.post('/friends/request', authMiddleware, requestFriend);
router.post('/friends/accept/:friendshipId', authMiddleware, acceptRequest);
router.post('/friends/reject/:friendshipId', authMiddleware, rejectRequest);
router.get('/friends', authMiddleware, listFriends);
router.get('/friends/pending', authMiddleware, listPendingRequests);
router.delete('/friends/:friendId', authMiddleware, deleteFriend);

// Metric Routes
import { ingestMetrics } from '../controllers/metric.controller.ts';

router.post('/metrics', authMiddleware, ingestMetrics);

export default router;
