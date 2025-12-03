import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { 
  createLogger, 
  validateConfig,
  correlationIdMiddleware,
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiter,
  errorHandler 
} from '@shared/index.ts';
import kafkaClient from './kafka.ts';
import { handleUserCreated } from './consumers/user-created.ts';
import './workers/email-worker.ts'; // Start email worker
import './workers/push-worker.ts'; // Start push worker
import { handleReminders } from './consumers/reminder-consumer.ts';
import { handleDoomscroll } from './consumers/doomscroll-consumer.ts';
import { handleMemory } from './consumers/memory-consumer.ts';
import { handleFriendEvents } from './consumers/friend-consumer.ts';
import { handleGamificationEvents } from './consumers/gamification-consumer.ts';
import { startWeeklyInsightsScheduler } from './schedulers/weekly-insights.ts';
import { startRetryProcessor } from './schedulers/retry-processor.ts';
import { startCleanupScheduler } from './schedulers/cleanup-scheduler.ts';
import deviceTokensRoutes from './routes/device-tokens.routes.ts';
import preferencesRoutes from './routes/preferences.routes.ts';

const logger = createLogger('notification-service');

// Validate environment configuration on startup
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(correlationIdMiddleware as any);
app.use(createHelmetMiddleware());
app.use(createCorsMiddleware());
app.use(express.json());
app.use(createRateLimiter() as any);

// Request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    correlationId: (req as any).correlationId,
    ip: req.ip
  });
  next();
});

// Health check endpoint
import prisma from './prisma.ts';
import { redisClient } from './redis.ts';
import { createHealthCheckHandler, createDatabaseHealthCheck, createRedisHealthCheck, createKafkaHealthCheck } from '@shared/index.ts';

const healthCheckHandler = await createHealthCheckHandler('notification-service', [
  createDatabaseHealthCheck(prisma as any),
  createRedisHealthCheck(redisClient),
  createKafkaHealthCheck(kafkaClient),
]);

app.get('/health', healthCheckHandler as any);

// API Routes
app.use('/device-tokens', deviceTokensRoutes);
app.use('/preferences', preferencesRoutes);

// Error handler must be registered after all routes
app.use(errorHandler as any);

const startServer = async () => {
  try {
    // Subscribe to Kafka topics
    await kafkaClient.consume('notification-group', 'user-events', handleUserCreated).catch((err: any) => {
      logger.error('Failed to subscribe to user-events', err);
    });

    await kafkaClient.consume('notification-group', 'reminder-events', handleReminders).catch((err: any) => {
      logger.error('Failed to subscribe to reminder-events', err);
    });

    await kafkaClient.consume('notification-group', 'learning-events', handleDoomscroll).catch((err: any) => {
      logger.error('Failed to subscribe to learning-events', err);
    });

    await kafkaClient.consume('notification-group', 'memory-events', handleMemory).catch((err: any) => {
      logger.error('Failed to subscribe to memory-events', err);
    });

    await kafkaClient.consume('notification-group', 'friend-events', handleFriendEvents).catch((err: any) => {
      logger.error('Failed to subscribe to friend-events', err);
    });

    await kafkaClient.consume('notification-group', 'gamification-events', handleGamificationEvents).catch((err: any) => {
      logger.error('Failed to subscribe to gamification-events', err);
    });

    // Start schedulers
    startWeeklyInsightsScheduler();
    startRetryProcessor();
    startCleanupScheduler();

    app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`, { service: 'notification-service' });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
  }
};

startServer();
