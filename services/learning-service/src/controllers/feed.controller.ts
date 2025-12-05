import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { asyncHandler } from '@shared/middleware';
import { FeedEngineService } from '../services/feed-engine.service.ts';
import { z } from 'zod';

const feedService = new FeedEngineService();

// Validation schemas
const markSeenSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
});

const feedbackSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(['VIEWED', 'CLICKED', 'DISMISSED']),
});

export class FeedController {
  /**
   * GET /feed/interest
   * Get personalized interest-based feed
   */
  static getInterestFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor as string | undefined;

    const items = await feedService.getInterestFeed(userId, limit, cursor);

    res.json({
      success: true,
      data: items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    });
  });

  /**
   * GET /feed/general
   * Get general trending feed
   */
  static getGeneralFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor as string | undefined;

    const items = await feedService.getGeneralFeed(userId, limit, cursor);

    res.json({
      success: true,
      data: items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    });
  });

  /**
   * POST /feed/seen
   * Mark items as seen
   */
  static markAsSeen = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const validated = markSeenSchema.parse(req.body);

    await feedService.markAsSeen(userId, validated.itemIds);

    res.json({
      success: true,
      message: 'Items marked as seen',
    });
  });

  /**
   * POST /feed/feedback
   * Record user feedback on feed item
   */
  static recordFeedback = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const validated = feedbackSchema.parse(req.body);

    await feedService.recordImpression(userId, validated.itemId, validated.action);

    res.json({
      success: true,
      message: 'Feedback recorded',
    });
  });
}
