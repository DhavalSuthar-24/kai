import { RedisClient } from '@shared/redis';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('leaderboard-cache');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

export class LeaderboardCache {
  private readonly GLOBAL_KEY = 'leaderboard:global';
  private readonly TOPIC_PREFIX = 'leaderboard:topic:';
  
  async updateUserScore(userId: string, points: number, topicId?: string): Promise<void> {
    try {
      // Update global leaderboard
      await redis.zadd(this.GLOBAL_KEY, points, userId);
      
      // Update topic-specific leaderboard if provided
      if (topicId) {
        const topicKey = `${this.TOPIC_PREFIX}${topicId}`;
        await redis.zadd(topicKey, points, userId);
      }
      
      logger.debug(`Updated leaderboard score for user ${userId}: ${points}`);
    } catch (error) {
      logger.error(`Failed to update leaderboard: ${error}`);
    }
  }
  
  async getTopUsers(limit: number = 10, topicId?: string): Promise<Array<{userId: string, points: number}>> {
    try {
      const key = topicId ? `${this.TOPIC_PREFIX}${topicId}` : this.GLOBAL_KEY;
      const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
      
      const leaderboard = [];
      for (let i = 0; i < results.length; i += 2) {
        leaderboard.push({
          userId: results[i],
          points: parseInt(results[i + 1])
        });
      }
      
      return leaderboard;
    } catch (error) {
      logger.error(`Failed to get leaderboard: ${error}`);
      return [];
    }
  }
  
  async getUserRank(userId: string, topicId?: string): Promise<number | null> {
    try {
      const key = topicId ? `${this.TOPIC_PREFIX}${topicId}` : this.GLOBAL_KEY;
      const rank = await redis.zrevrank(key, userId);
      return rank !== null ? rank + 1 : null;
    } catch (error) {
      logger.error(`Failed to get user rank: ${error}`);
      return null;
    }
  }
  
  async invalidate(topicId?: string): Promise<void> {
    try {
      if (topicId) {
        await redis.del(`${this.TOPIC_PREFIX}${topicId}`);
      } else {
        await redis.del(this.GLOBAL_KEY);
      }
      logger.debug(`Invalidated leaderboard cache`);
    } catch (error) {
      logger.warn(`Failed to invalidate leaderboard: ${error}`);
    }
  }
}

export const leaderboardCache = new LeaderboardCache();
