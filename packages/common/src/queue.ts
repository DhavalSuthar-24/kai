import { Queue, Worker, type Processor, type QueueOptions, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from './logger.ts';

const logger = createLogger('queue-factory');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

export class QueueFactory {
  static createQueue(name: string, options?: QueueOptions) {
    logger.info(`Creating queue: ${name}`);
    return new Queue(name, {
      connection,
      ...options,
    });
  }

  static createWorker(name: string, processor: Processor, options?: WorkerOptions) {
    logger.info(`Creating worker for queue: ${name}`);
    return new Worker(name, processor, {
      connection,
      ...options,
    });
  }
}
