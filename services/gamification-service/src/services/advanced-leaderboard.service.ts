import { RedisClient, createLogger } from '@shared/index.ts';
import prisma from '../prisma.ts';

const logger = createLogger('advanced-leaderboard-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type LeaderboardCategory = 'global' | 'topic' | 'challenge';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name?: string;
  anonId?: string;
  points: number;
  level?: number;
  streak?: number;
}

export class AdvancedLeaderboardService {
  /**
   * Get leaderboard for a specific period
   */
  async getLeaderboard(
    period: LeaderboardPeriod,
    limit: number = 10,
    category: LeaderboardCategory = 'global'
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${period}:${category}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let entries: LeaderboardEntry[] = [];

    switch (period) {
      case 'daily':
        entries = await this.getDailyLeaderboard(limit);
        break;
      case 'weekly':
        entries = await this.getWeeklyLeaderboard(limit);
        break;
      case 'monthly':
        entries = await this.getMonthlyLeaderboard(limit);
        break;
      case 'all-time':
        entries = await this.getAllTimeLeaderboard(limit);
        break;
    }

    // Cache for appropriate duration
    const cacheDuration = this.getCacheDuration(period);
    await redis.set(cacheKey, JSON.stringify(entries), cacheDuration);

    return entries;
  }

  /**
   * Get daily leaderboard (based on today's activity)
   */
  private async getDailyLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activities = await prisma.dailyActivity.findMany({
      where: { date: today },
      orderBy: { points: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    return activities.map((activity, index) => ({
      rank: index + 1,
      userId: activity.userId,
      name: activity.user?.name,
      points: activity.points
    }));
  }

  /**
   * Get weekly leaderboard (last 7 days)
   */
  private async getWeeklyLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    // Aggregate points from last 7 days
    const activities = await prisma.dailyActivity.groupBy({
      by: ['userId'],
      where: {
        date: { gte: weekAgo }
      },
      _sum: {
        points: true
      },
      orderBy: {
        _sum: {
          points: 'desc'
        }
      },
      take: limit
    });

    // Fetch user details
    const userIds = activities.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return activities.map((activity, index) => ({
      rank: index + 1,
      userId: activity.userId,
      name: userMap.get(activity.userId)?.name,
      points: activity._sum.points || 0
    }));
  }

  /**
   * Get monthly leaderboard (last 30 days)
   */
  private async getMonthlyLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const activities = await prisma.dailyActivity.groupBy({
      by: ['userId'],
      where: {
        date: { gte: monthAgo }
      },
      _sum: {
        points: true
      },
      orderBy: {
        _sum: {
          points: 'desc'
        }
      },
      take: limit
    });

    const userIds = activities.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return activities.map((activity, index) => ({
      rank: index + 1,
      userId: activity.userId,
      name: userMap.get(activity.userId)?.name,
      points: activity._sum.points || 0
    }));
  }

  /**
   * Get all-time leaderboard
   */
  private async getAllTimeLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const topUsers = await prisma.userProgress.findMany({
      orderBy: { points: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    return topUsers.map((progress, index) => ({
      rank: index + 1,
      userId: progress.userId,
      name: progress.user?.name,
      points: progress.points,
      level: progress.level,
      streak: progress.streak
    }));
  }

  /**
   * Get friend leaderboard
   */
  async getFriendLeaderboard(userId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    // Get user's friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    const friendIds = friendships.map(f =>
      f.userId === userId ? f.friendId : f.userId
    );

    // Include self
    friendIds.push(userId);

    // Get progress for all friends
    const friendProgress = await prisma.userProgress.findMany({
      where: { userId: { in: friendIds } },
      orderBy: { points: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    return friendProgress.map((progress, index) => ({
      rank: index + 1,
      userId: progress.userId,
      name: progress.user?.name,
      points: progress.points,
      level: progress.level,
      streak: progress.streak
    }));
  }

  /**
   * Get user's rank in a specific leaderboard
   */
  async getUserRank(userId: string, period: LeaderboardPeriod): Promise<{
    rank: number | null;
    points: number;
    totalUsers: number;
  }> {
    let rank: number | null = null;
    let points = 0;
    let totalUsers = 0;

    switch (period) {
      case 'daily': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const userActivity = await prisma.dailyActivity.findUnique({
          where: { userId_date: { userId, date: today } }
        });

        if (userActivity) {
          points = userActivity.points;
          
          const betterUsers = await prisma.dailyActivity.count({
            where: {
              date: today,
              points: { gt: points }
            }
          });

          rank = betterUsers + 1;
          totalUsers = await prisma.dailyActivity.count({ where: { date: today } });
        }
        break;
      }

      case 'all-time': {
        const progress = await prisma.userProgress.findUnique({
          where: { userId }
        });

        if (progress) {
          points = progress.points;

          const betterUsers = await prisma.userProgress.count({
            where: { points: { gt: points } }
          });

          rank = betterUsers + 1;
          totalUsers = await prisma.userProgress.count();
        }
        break;
      }

      // Similar logic for weekly/monthly
    }

    return { rank, points, totalUsers };
  }

  /**
   * Invalidate leaderboard cache
   */
  async invalidateCache(period?: LeaderboardPeriod) {
    if (period) {
      await redis.del(`leaderboard:${period}:global`);
    } else {
      // Invalidate all
      const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'all-time'];
      for (const p of periods) {
        await redis.del(`leaderboard:${p}:global`);
      }
    }
  }

  /**
   * Get cache duration based on period
   */
  private getCacheDuration(period: LeaderboardPeriod): number {
    switch (period) {
      case 'daily':
        return 300; // 5 minutes
      case 'weekly':
        return 900; // 15 minutes
      case 'monthly':
        return 1800; // 30 minutes
      case 'all-time':
        return 3600; // 1 hour
      default:
        return 300;
    }
  }
}

export const advancedLeaderboardService = new AdvancedLeaderboardService();
