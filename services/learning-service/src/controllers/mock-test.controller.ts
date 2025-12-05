import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { asyncHandler } from '@shared/middleware';
import { MockTestService } from '../services/mock-test.service.ts';
import { resultVerificationService } from '../services/result-verification.service.ts';
import { mockTestAnalyticsService } from '../services/mock-test-analytics.service.ts';
import { z } from 'zod';

const mockTestService = new MockTestService();

// Validation schemas
const createTestSchema = z.object({
  topicId: z.string().uuid(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  questionCount: z.number().min(5).max(50).default(20),
  timeLimit: z.number().min(10).max(180).default(60), // minutes
});

const submitTestSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.string(),
      correct: z.boolean(),
      timeSeconds: z.number(),
    })
  ),
});

const violationSchema = z.object({
  violationType: z.enum(['TAB_SWITCH', 'SCREENSHOT', 'MOUSE_BOT', 'OTHER']),
  metadata: z.any().optional(),
});

export class MockTestController {
  /**
   * POST /mock-tests/create
   * Generate a new mock test
   */
  static createTest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const validated = createTestSchema.parse(req.body);

    const session = await mockTestService.generateTest(userId, validated);

    res.json({
      success: true,
      data: session,
      message: 'Mock test created successfully',
    });
  });

  /**
   * POST /mock-tests/:id/submit
   * Submit test answers
   */
  static submitTest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const sessionId = req.params.id;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    
    const validated = submitTestSchema.parse(req.body);

    const result = await mockTestService.submitTest(sessionId, userId, validated.answers);

    res.json({
      success: true,
      data: result,
      message: result.suspicious
        ? 'Test submitted. Suspicious activity detected.'
        : 'Test submitted successfully!',
    });
  });

  /**
   * POST /mock-tests/:id/violation
   * Record anti-cheat violation
   */
  static recordViolation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessionId = req.params.id;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    
    const validated = violationSchema.parse(req.body);

    await mockTestService.recordViolation(
      sessionId,
      validated.violationType,
      validated.metadata
    );

    res.json({
      success: true,
      message: 'Violation recorded',
    });
  });

  /**
   * GET /mock-tests/leaderboard/:topicId
   * Get leaderboard for topic
   */
  static getLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const topicId = req.params.topicId;
    
    if (!topicId) {
      return res.status(400).json({ success: false, message: 'Topic ID is required' });
    }

    const leaderboard = await mockTestService.getLeaderboard(topicId, userId);

    res.json({
      success: true,
      data: leaderboard,
    });
  });

  /**
   * POST /mock-tests/results/:resultId/share
   * Generate shareable result
   */
  static shareResult = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const resultId = req.params.resultId;

    if (!resultId) {
      return res.status(400).json({ success: false, message: 'Result ID is required' });
    }

    const shareableResult = await resultVerificationService.generateShareableResult(
      resultId,
      userId
    );

    res.json({
      success: true,
      data: shareableResult,
      message: 'Result shared successfully',
    });
  });

  /**
   * GET /mock-tests/shared/:shareId
   * Verify and retrieve shared result
   */
  static getSharedResult = asyncHandler(async (req: AuthRequest, res: Response) => {
    const shareId = req.params.shareId;

    if (!shareId) {
      return res.status(400).json({ success: false, message: 'Share ID is required' });
    }

    // Track view
    await resultVerificationService.trackShareView(shareId);

    const result = await resultVerificationService.verifySharedResult(shareId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Shared result not found or expired',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /mock-tests/analytics/user
   * Get user analytics
   */
  static getUserAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    const analytics = await mockTestAnalyticsService.getUserAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * GET /mock-tests/analytics/topic/:topicId
   * Get topic analytics
   */
  static getTopicAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const topicId = req.params.topicId;

    if (!topicId) {
      return res.status(400).json({ success: false, message: 'Topic ID is required' });
    }

    const analytics = await mockTestAnalyticsService.getTopicAnalytics(topicId);

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * GET /mock-tests/analytics/compare/:userId
   * Compare performance with another user
   */
  static comparePerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId1 = req.user?.id!;
    const userId2 = req.params.userId;
    const topicId = req.query.topicId as string | undefined;

    if (!userId2) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const comparison = await mockTestAnalyticsService.comparePerformance(
      userId1,
      userId2,
      topicId
    );

    res.json({
      success: true,
      data: comparison,
    });
  });
}
