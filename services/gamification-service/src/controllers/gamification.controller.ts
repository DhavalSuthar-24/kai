import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { asyncHandler } from '@shared/middleware';
import { levelProgressionService } from '../services/level-progression.service.ts';
import { advancedLeaderboardService, type LeaderboardPeriod } from '../services/advanced-leaderboard.service.ts';
import { deepLinkService } from '../services/deep-link.service.ts';

import { achievementService } from '../services/achievement.service.ts';
import prisma from '../prisma.ts';

export class GamificationController {
  /**
   * GET /gamification/achievements
   * Get all available achievements
   */
  static getAchievements = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const achievements = await achievementService.getAchievements();
    res.json({ success: true, data: achievements });
  });

  /**
   * GET /gamification/my-achievements
   * Get user's unlocked achievements
   */
  static getMyAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const achievements = await achievementService.getUserAchievements(userId);
    res.json({ success: true, data: achievements });
  });

  /**
   * GET /gamification/share/:userId
   * Get public profile/share info
   */
  static getSocialShare = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.userId;
    
    // Get user progress
    const progress = await prisma.userProgress.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } }
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get recent achievements
    const recentAchievements = await achievementService.getUserAchievements(userId);
    
    res.json({
      success: true,
      data: {
        user: {
          name: progress.user?.name,
          level: progress.level,
          points: progress.points,
          streak: progress.streak
        },
        recentAchievements: recentAchievements.slice(0, 3)
      }
    });
  });

  /**
   * GET /gamification/level-info
   * Get current level progress
   */
  static getLevelInfo = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const levelInfo = await levelProgressionService.getLevelInfo(userId);
    
    res.json({
      success: true,
      data: levelInfo
    });
  });

  /**
   * GET /gamification/levels
   * Get all level thresholds
   */
  static getLevelThresholds = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const thresholds = levelProgressionService.getLevelThresholds();
    
    res.json({
      success: true,
      data: thresholds
    });
  });

  /**
   * GET /gamification/leaderboard/:period
   * Get advanced leaderboard (daily, weekly, monthly, all-time)
   */
  static getLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const period = req.params.period as LeaderboardPeriod;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = (req.query.category as any) || 'global';
    
    // Validate period
    if (!['daily', 'weekly', 'monthly', 'all-time'].includes(period)) {
      return res.status(400).json({ success: false, message: 'Invalid period' });
    }

    const leaderboard = await advancedLeaderboardService.getLeaderboard(period, limit, category);
    
    // Get user's rank
    const userId = req.user?.id!;
    const userRank = await advancedLeaderboardService.getUserRank(userId, period);

    res.json({
      success: true,
      data: {
        leaderboard,
        userRank
      }
    });
  });

  /**
   * GET /gamification/leaderboard/friends
   * Get friend leaderboard
   */
  static getFriendLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await advancedLeaderboardService.getFriendLeaderboard(userId, limit);

    res.json({
      success: true,
      data: leaderboard
    });
  });

  /**
   * POST /gamification/deep-link
   * Generate deep link
   */
  static generateDeepLink = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, id, metadata } = req.body;
    
    if (!type || !id) {
       return res.status(400).json({ success: false, message: 'Type and ID are required' });
    }

    const deepLink = deepLinkService.generateDeepLink({ type, id, metadata });

    res.json({
      success: true,
      data: deepLink
    });
  });
}
