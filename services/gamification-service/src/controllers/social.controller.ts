import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { asyncHandler } from '@shared/middleware';
import { SocialGraphService } from '../services/social-graph.service.ts';
import { ResultVerificationService } from '../services/result-verification.service.ts';
import { ViralService } from '../services/viral.service.ts';
import { CommunityService } from '../services/community.service.ts';
import { z } from 'zod';

const socialService = new SocialGraphService();
const verificationService = new ResultVerificationService();
const viralService = new ViralService();
const communityService = new CommunityService();

// Validation schemas
const followSchema = z.object({
  topics: z.array(z.string()).optional().default([]),
});

const shareResultSchema = z.object({
  resultType: z.enum(['CHALLENGE', 'MOCK_TEST', 'ACHIEVEMENT']),
  visibility: z.enum(['PUBLIC', 'UNLISTED']).default('PUBLIC'),
});

const questionSchema = z.object({
  topicId: z.string().uuid(),
  questionText: z.string().min(10).max(1000),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(20).max(5000),
});

export class SocialController {
  // ========== Social Graph Endpoints ==========
  
  static followUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const followerId = req.user?.id!;
    const { userId: targetId } = req.params;
    const validated = followSchema.parse(req.body);

    await socialService.followUser(followerId, targetId, validated.topics);

    res.json({ success: true, message: 'User followed successfully' });
  });

  static unfollowUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const followerId = req.user?.id!;
    const { userId: targetId } = req.params;

    await socialService.unfollowUser(followerId, targetId);

    res.json({ success: true, message: 'User unfollowed' });
  });

  static getFollowers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const followers = await socialService.getFollowers(userId);

    res.json({ success: true, data: followers });
  });

  static getFollowing = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const following = await socialService.getFollowing(userId);

    res.json({ success: true, data: following });
  });

  static blockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { userId: blockedId } = req.params;

    await socialService.blockUser(userId, blockedId);

    res.json({ success: true, message: 'User blocked' });
  });

  // ========== Result Sharing Endpoints ==========

  static shareResult = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { id: resultId } = req.params;
    const validated = shareResultSchema.parse(req.body);

    const shareId = await verificationService.shareResult(
      resultId,
      validated.resultType,
      userId,
      validated.visibility
    );

    res.json({
      success: true,
      data: { shareId, url: `${process.env.APP_URL}/shared/${shareId}` },
    });
  });

  static getSharedResult = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { shareId } = req.params;

    const result = await verificationService.getSharedResult(shareId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Shared result not found' });
    }

    const isVerified = await verificationService.verifyProof(shareId);

    res.json({ success: true, data: { ...result, verified: isVerified } });
  });

  // ========== Viral/Badge Endpoints (Existing) ==========

  static generateBadge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const template = (req.query.template as string) || 'minimal';

    const badge = await viralService.generateStreakBadge(userId, template);

    res.json({ success: true, data: badge });
  });

  static trackShare = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { platform, shareType, deepLink } = req.body;

    await viralService.trackShareEvent(userId, platform, shareType, deepLink);

    res.json({ success: true, message: 'Share tracked' });
  });

  static handleInstall = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sourceUser, newUser, campaign } = req.body;

    await viralService.handleDeepLinkInstall(sourceUser, newUser, campaign);

    res.json({ success: true, message: 'Install tracked' });
  });

  // ========== Community Q&A Endpoints (Existing) ==========

  static postQuestion = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const validated = questionSchema.parse(req.body);

    const question = await communityService.postQuestion(
      userId,
      validated.topicId,
      validated.questionText
    );

    res.json({ success: true, data: question });
  });

  static submitAnswer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const validated = answerSchema.parse(req.body);

    const answer = await communityService.submitAnswer(
      userId,
      validated.questionId,
      validated.answerText
    );

    res.json({ success: true, data: answer });
  });

  static getFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const topicId = req.query.topicId as string | undefined;

    const feed = await communityService.getFeed(userId, topicId);

    res.json({ success: true, data: feed });
  });
}
