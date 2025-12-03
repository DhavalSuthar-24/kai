import Redis from 'ioredis';
import { createLogger } from './logger.ts';

const logger = createLogger('redis-wrapper');

export class RedisClient {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
    this.client.on('connect', () => logger.info('Redis connected'));
    this.client.on('error', (err) => logger.error('Redis error', err));
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string) {
    return await this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }
  
  getClient() {
      return this.client;
  }
}
