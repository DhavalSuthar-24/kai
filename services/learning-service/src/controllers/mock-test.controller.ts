import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { asyncHandler } from '@shared/middleware';
import { MockTestService } from '../services/mock-test.service.ts';
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
    const { id: sessionId } = req.params;
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
    const { id: sessionId } = req.params;
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
    const { topicId } = req.params;

    const leaderboard = await mockTestService.getLeaderboard(topicId, userId);

    res.json({
      success: true,
      data: leaderboard,
    });
  });
}
