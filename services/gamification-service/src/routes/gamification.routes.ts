import { Router } from 'express';
import { GamificationController } from '../controllers/gamification.controller.ts';
import { createGoal, getGoals, getGoalProgress, updateGoal, deleteGoal } from '../controllers/goals.controller.ts';
import { requestFriend, acceptRequest, rejectRequest, listFriends, listPendingRequests, deleteFriend } from '../controllers/friends.controller.ts';
import { validateRequest, userGoalSchema, authMiddleware } from '@shared/index.ts';
import { createChallenge, joinChallenge, getChallenges, getMyChallenges } from '../controllers/challenge.controller.ts';
import { ingestMetrics } from '../controllers/metric.controller.ts';

const router = Router();

// Level & Progress
router.get('/level-info', authMiddleware, GamificationController.getLevelInfo);
router.get('/levels', GamificationController.getLevelThresholds);

// Leaderboards
router.get('/leaderboard/friends', authMiddleware, GamificationController.getFriendLeaderboard);
router.get('/leaderboard/:period', authMiddleware, GamificationController.getLeaderboard); // period: daily, weekly, monthly, all-time

// Deep Links
router.post('/deep-link', authMiddleware, GamificationController.generateDeepLink);

// Social & Sharing
router.get('/share/:userId', GamificationController.getSocialShare);

// Achievements
router.get('/achievements', GamificationController.getAchievements);
router.get('/my-achievements', authMiddleware, GamificationController.getMyAchievements);


// Challenge Routes
router.post('/challenges', authMiddleware, createChallenge);
router.post('/challenges/:id/join', authMiddleware, joinChallenge);
router.get('/challenges', authMiddleware, getChallenges);
router.get('/challenges/my', authMiddleware, getMyChallenges);

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
router.post('/metrics', authMiddleware, ingestMetrics);

export default router;
