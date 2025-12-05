import Redis from 'ioredis';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('rate-limiter');

export interface RateLimitConfig {
  emailPerHour: number;
  pushPerHour: number;
}

export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(redis: Redis, config: RateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Check if user has exceeded rate limit for a specific channel
   * Uses sliding window algorithm with Redis
   */
  async checkRateLimit(
    userId: string,
    channel: 'EMAIL' | 'PUSH' | 'SMS'
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const limit = channel === 'EMAIL' ? this.config.emailPerHour : this.config.pushPerHour;
    const key = `ratelimit:${channel.toLowerCase()}:${userId}`;
    const now = Date.now();
    const windowStart = now - 3600000; // 1 hour ago

    try {
      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count current entries in the window
      const count = await this.redis.zcard(key);

      if (count >= limit) {
        // Get the oldest entry to calculate reset time
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldest.length > 1 
          ? new Date(parseInt(oldest[1]) + 3600000)
          : new Date(now + 3600000);

        logger.warn(`Rate limit exceeded for user ${userId} on ${channel}`, {
          userId,
          channel,
          count,
          limit,
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Add current request to the window
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);
      await this.redis.expire(key, 3600); // Expire key after 1 hour

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: new Date(now + 3600000),
      };
    } catch (error) {
      logger.error('Rate limit check failed', error);
      // Fail open - allow the request if Redis is down
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(now + 3600000),
      };
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  async resetRateLimit(userId: string, channel?: 'EMAIL' | 'PUSH'): Promise<void> {
    try {
      if (channel) {
        const key = `ratelimit:${channel.toLowerCase()}:${userId}`;
        await this.redis.del(key);
        logger.info(`Reset rate limit for user ${userId} on ${channel}`);
      } else {
        // Reset both channels
        await this.redis.del(`ratelimit:email:${userId}`);
        await this.redis.del(`ratelimit:push:${userId}`);
        logger.info(`Reset all rate limits for user ${userId}`);
      }
    } catch (error) {
      logger.error('Failed to reset rate limit', error);
      throw error;
    }
  }

  /**
   * Get current rate limit status for a user
   */
  async getRateLimitStatus(
    userId: string,
    channel: 'EMAIL' | 'PUSH'
  ): Promise<{ count: number; limit: number; remaining: number }> {
    const limit = channel === 'EMAIL' ? this.config.emailPerHour : this.config.pushPerHour;
    const key = `ratelimit:${channel.toLowerCase()}:${userId}`;
    const now = Date.now();
    const windowStart = now - 3600000;

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const count = await this.redis.zcard(key);

      return {
        count,
        limit,
        remaining: Math.max(0, limit - count),
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', error);
      return { count: 0, limit, remaining: limit };
    }
  }
}
