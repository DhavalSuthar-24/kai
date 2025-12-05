import { RedisClient } from '@shared/redis';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('topic-cache');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

export class TopicCache {
  private readonly TTL = 3600; // 1 hour
  
  async getUserTopics(userId: string): Promise<any[] | null> {
    const key = `topics:user:${userId}`;
    
    try {
      const cached = await redis.get(key);
      if (cached) {
        logger.debug(`Cache hit for user ${userId} topics`);
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn(`Redis cache read failed: ${error}`);
    }
    
    return null;
  }
  
  async setUserTopics(userId: string, topics: any[]): Promise<void> {
    const key = `topics:user:${userId}`;
    
    try {
      await redis.setex(key, this.TTL, JSON.stringify(topics));
      logger.debug(`Cached topics for user ${userId}`);
    } catch (error) {
      logger.warn(`Redis cache write failed: ${error}`);
    }
  }
  
  async invalidate(userId: string): Promise<void> {
    const key = `topics:user:${userId}`;
    
    try {
      await redis.del(key);
      logger.debug(`Invalidated cache for user ${userId}`);
    } catch (error) {
      logger.warn(`Redis cache invalidation failed: ${error}`);
    }
  }
}

export const topicCache = new TopicCache();
