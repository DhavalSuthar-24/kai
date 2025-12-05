import prisma from '../prisma.ts';
import { createLogger } from '@shared/logger';
import { RedisClient } from '@shared/redis';

const logger = createLogger('mock-test-analytics-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

export interface UserAnalytics {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averagePercentile: number;
  improvement: number; // Percentage improvement from first to last
  weakTopics: Array<{
    topicId: string;
    averageScore: number;
    attempts: number;
  }>;
  strongTopics: Array<{
    topicId: string;
    averageScore: number;
    attempts: number;
  }>;
  recentTests: Array<{
    testId: string;
    topicId: string;
    score: number;
    percentile: number;
    submittedAt: Date;
  }>;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    average: number; // 50-69
    needsImprovement: number; // 0-49
  };
}

export interface TopicAnalytics {
  topicId: string;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  scoreDistribution: number[]; // Array of scores for histogram
  topPerformers: Array<{
    anonId: string;
    score: number;
    percentile: number;
  }>;
  difficultyBreakdown: {
    easy: { attempts: number; avgScore: number };
    medium: { attempts: number; avgScore: number };
    hard: { attempts: number; avgScore: number };
  };
}

export class MockTestAnalyticsService {
  /**
   * Get comprehensive analytics for a user
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      // Check cache first
      const cacheKey = `analytics:user:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch all user results
      const results = await prisma.mockTestResult.findMany({
        where: { userId },
        orderBy: { submittedAt: 'asc' },
        include: { test: true }
      });

      if (results.length === 0) {
        return this.getEmptyUserAnalytics();
      }

      // Calculate metrics
      const totalAttempts = results.length;
      const scores = results.map(r => r.score);
      const percentiles = results.map(r => r.percentile);

      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      const averagePercentile = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;

      // Calculate improvement (first 3 tests vs last 3 tests)
      const improvement = this.calculateImprovement(scores);

      // Group by topic
      const byTopic = this.groupByTopic(results);
      const weakTopics = Object.entries(byTopic)
        .map(([topicId, data]) => ({
          topicId,
          averageScore: data.avgScore,
          attempts: data.count
        }))
        .filter(t => t.averageScore < 60)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 5);

      const strongTopics = Object.entries(byTopic)
        .map(([topicId, data]) => ({
          topicId,
          averageScore: data.avgScore,
          attempts: data.count
        }))
        .filter(t => t.averageScore >= 70)
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5);

      // Recent tests
      const recentTests = results
        .slice(-10)
        .reverse()
        .map(r => ({
          testId: r.testId,
          topicId: r.topicId,
          score: r.score,
          percentile: r.percentile,
          submittedAt: r.submittedAt
        }));

      // Score distribution
      const scoreDistribution = {
        excellent: scores.filter(s => s >= 90).length,
        good: scores.filter(s => s >= 70 && s < 90).length,
        average: scores.filter(s => s >= 50 && s < 70).length,
        needsImprovement: scores.filter(s => s < 50).length
      };

      const analytics: UserAnalytics = {
        totalAttempts,
        averageScore,
        highestScore,
        lowestScore,
        averagePercentile,
        improvement,
        weakTopics,
        strongTopics,
        recentTests,
        scoreDistribution
      };

      // Cache for 10 minutes
      await redis.set(cacheKey, JSON.stringify(analytics), 600);

      return analytics;
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      return this.getEmptyUserAnalytics();
    }
  }

  /**
   * Get analytics for a specific topic
   */
  async getTopicAnalytics(topicId: string): Promise<TopicAnalytics> {
    try {
      // Check cache
      const cacheKey = `analytics:topic:${topicId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch all results for this topic
      const results = await prisma.mockTestResult.findMany({
        where: { topicId },
        include: { test: true }
      });

      if (results.length === 0) {
        return this.getEmptyTopicAnalytics(topicId);
      }

      const scores = results.map(r => r.score);
      const totalAttempts = results.length;
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);

      // Top performers (anonymized)
      const topPerformers = results
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(r => ({
          anonId: this.generateAnonId(r.userId),
          score: r.score,
          percentile: r.percentile
        }));

      // Difficulty breakdown
      const byDifficulty = results.reduce((acc, r) => {
        const diff = r.test.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
        if (!acc[diff]) {
          acc[diff] = { scores: [], count: 0 };
        }
        acc[diff].scores.push(r.score);
        acc[diff].count++;
        return acc;
      }, {} as Record<string, { scores: number[]; count: number }>);

      const difficultyBreakdown = {
        easy: {
          attempts: byDifficulty.easy?.count || 0,
          avgScore: byDifficulty.easy ? byDifficulty.easy.scores.reduce((a, b) => a + b, 0) / byDifficulty.easy.scores.length : 0
        },
        medium: {
          attempts: byDifficulty.medium?.count || 0,
          avgScore: byDifficulty.medium ? byDifficulty.medium.scores.reduce((a, b) => a + b, 0) / byDifficulty.medium.scores.length : 0
        },
        hard: {
          attempts: byDifficulty.hard?.count || 0,
          avgScore: byDifficulty.hard ? byDifficulty.hard.scores.reduce((a, b) => a + b, 0) / byDifficulty.hard.scores.length : 0
        }
      };

      const analytics: TopicAnalytics = {
        topicId,
        totalAttempts,
        averageScore,
        highestScore,
        lowestScore,
        scoreDistribution: scores,
        topPerformers,
        difficultyBreakdown
      };

      // Cache for 15 minutes
      await redis.set(cacheKey, JSON.stringify(analytics), 900);

      return analytics;
    } catch (error) {
      logger.error('Error getting topic analytics:', error);
      return this.getEmptyTopicAnalytics(topicId);
    }
  }

  /**
   * Get performance comparison between users (for challenges)
   */
  async comparePerformance(userId1: string, userId2: string, topicId?: string): Promise<{
    user1: { averageScore: number; totalAttempts: number };
    user2: { averageScore: number; totalAttempts: number };
    winner: string | null;
  }> {
    const where = topicId ? { topicId } : {};

    const user1Results = await prisma.mockTestResult.findMany({
      where: { userId: userId1, ...where }
    });

    const user2Results = await prisma.mockTestResult.findMany({
      where: { userId: userId2, ...where }
    });

    const user1Avg = user1Results.length > 0
      ? user1Results.reduce((sum, r) => sum + r.score, 0) / user1Results.length
      : 0;

    const user2Avg = user2Results.length > 0
      ? user2Results.reduce((sum, r) => sum + r.score, 0) / user2Results.length
      : 0;

    return {
      user1: { averageScore: user1Avg, totalAttempts: user1Results.length },
      user2: { averageScore: user2Avg, totalAttempts: user2Results.length },
      winner: user1Avg > user2Avg ? userId1 : user2Avg > user1Avg ? userId2 : null
    };
  }

  /**
   * Helper: Calculate improvement percentage
   */
  private calculateImprovement(scores: number[]): number {
    if (scores.length < 2) return 0;

    const firstThree = scores.slice(0, Math.min(3, scores.length));
    const lastThree = scores.slice(-Math.min(3, scores.length));

    const firstAvg = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;
    const lastAvg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;

    return ((lastAvg - firstAvg) / firstAvg) * 100;
  }

  /**
   * Helper: Group results by topic
   */
  private groupByTopic(results: any[]): Record<string, { avgScore: number; count: number }> {
    const grouped = results.reduce((acc, r) => {
      if (!acc[r.topicId]) {
        acc[r.topicId] = { scores: [], count: 0 };
      }
      acc[r.topicId].scores.push(r.score);
      acc[r.topicId].count++;
      return acc;
    }, {} as Record<string, { scores: number[]; count: number }>);

    return Object.entries(grouped).reduce((acc, [topicId, data]) => {
      acc[topicId] = {
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        count: data.count
      };
      return acc;
    }, {} as Record<string, { avgScore: number; count: number }>);
  }

  /**
   * Helper: Generate anonymized ID
   */
  private generateAnonId(userId: string): string {
    const crypto = require('crypto');
    const secret = process.env.ANON_SECRET || 'anon-secret';
    return crypto.createHmac('sha256', secret).update(userId).digest('hex').substring(0, 12);
  }

  /**
   * Helper: Empty user analytics
   */
  private getEmptyUserAnalytics(): UserAnalytics {
    return {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      averagePercentile: 0,
      improvement: 0,
      weakTopics: [],
      strongTopics: [],
      recentTests: [],
      scoreDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        needsImprovement: 0
      }
    };
  }

  /**
   * Helper: Empty topic analytics
   */
  private getEmptyTopicAnalytics(topicId: string): TopicAnalytics {
    return {
      topicId,
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      scoreDistribution: [],
      topPerformers: [],
      difficultyBreakdown: {
        easy: { attempts: 0, avgScore: 0 },
        medium: { attempts: 0, avgScore: 0 },
        hard: { attempts: 0, avgScore: 0 }
      }
    };
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await redis.del(`analytics:user:${userId}`);
  }

  /**
   * Invalidate cache for topic
   */
  async invalidateTopicCache(topicId: string): Promise<void> {
    await redis.del(`analytics:topic:${topicId}`);
  }
}

export const mockTestAnalyticsService = new MockTestAnalyticsService();
