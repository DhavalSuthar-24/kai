import { Router } from 'express';
import { authMiddleware } from '@shared/middleware';
import { SocialController } from '../controllers/social.controller.ts';

const router = Router();

router.use(authMiddleware);

// ========== Social Graph Endpoints (NEW) ==========
router.post('/follow/:userId', SocialController.followUser);
router.delete('/unfollow/:userId', SocialController.unfollowUser);
router.get('/followers', SocialController.getFollowers);
router.get('/following', SocialController.getFollowing);
router.post('/block/:userId', SocialController.blockUser);

// ========== Result Sharing Endpoints (NEW) ==========
router.post('/results/:id/share', SocialController.shareResult);
router.get('/shared/:shareId', SocialController.getSharedResult);

// ========== Viral/Badge Endpoints (EXISTING) ==========
router.get('/badge', SocialController.generateBadge);
router.post('/share', SocialController.trackShare);

// Install tracking (no auth required, protected by API key if needed)
router.post('/webhook/install', SocialController.handleInstall);

// ========== Community Q&A Endpoints (EXISTING) ==========
router.post('/questions', SocialController.postQuestion);
router.post('/answers', SocialController.submitAnswer);
router.get('/feed', SocialController.getFeed);

export default router;
