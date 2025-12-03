import Redis from 'ioredis';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    logger.error('Redis connection error', err);
    return true;
  }
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisClient.on('error', (err) => {
  logger.error('Redis error', err);
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

export default redisClient;
