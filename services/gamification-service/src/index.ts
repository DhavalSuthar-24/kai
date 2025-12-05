import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { initializeLeaderboardSocket } from './websocket/leaderboard-socket.ts';
import { 
  createLogger, 
  validateConfig,
  correlationIdMiddleware,
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiter,
  errorHandler,
  initializeSentry,
  createMetricsCollector
} from '@shared/index.ts';
import gamificationRoutes from './routes/gamification.routes.ts';
import socialRoutes from './routes/social.routes.ts';
import challengeRoutes from './routes/challenge.routes.ts';

const logger = createLogger('gamification-service');

// Initialize Sentry for error tracking
initializeSentry({ serviceName: 'gamification-service' });

// Validate environment configuration on startup
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3004;

// Metrics collector
const metrics = createMetricsCollector('gamification_service');

// Security middleware
app.use(correlationIdMiddleware);
app.use(createHelmetMiddleware());
app.use(createCorsMiddleware());
app.use(express.json());

// Metrics middleware (before routes)
app.use(metrics.middleware());

app.use(createRateLimiter());

import kafkaClient from './kafka.ts';
import { handleActivityEvent } from './consumers/activity.consumer.ts';

// Request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    correlationId: (req as any).correlationId,
    ip: req.ip
  });
  next();
});

app.use('/gamification', gamificationRoutes);
app.use('/social', socialRoutes);
app.use('/challenges', challengeRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.registry.contentType);
  res.end(await metrics.getMetrics());
});

// Health check endpoint
import prisma from './prisma.ts';
import { createHealthCheckHandler, createDatabaseHealthCheck, createKafkaHealthCheck } from '@shared/index.ts';

app.get('/health', await createHealthCheckHandler('gamification-service', [
  createDatabaseHealthCheck(prisma as any),
  createKafkaHealthCheck(kafkaClient),
]));

app.use(errorHandler as any);

const startServer = async () => {
  try {
    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket
    initializeLeaderboardSocket(httpServer);

    await kafkaClient.connectProducer().catch((err: unknown) => {
        logger.error('Failed to connect to Kafka Producer', err);
    });

    // Subscribe to learning-events
    await kafkaClient.consume('gamification-group', 'learning-events', handleActivityEvent).catch((err: unknown) => {
        logger.error('Failed to subscribe to Kafka topic learning-events', err);
    });

    // Subscribe to focus-events
    await kafkaClient.consume('gamification-group', 'focus-events', handleActivityEvent).catch((err: unknown) => {
        logger.error('Failed to subscribe to Kafka topic focus-events', err);
    });

    // Subscribe to user-events
    await import('./consumers/user-consumer.ts').then(async (module) => {
        await kafkaClient.consume('gamification-group', 'user-events', module.handleUserCreated).catch((err: unknown) => {
            logger.error('Failed to subscribe to Kafka topic', err);
        });
    });

    // Subscribe to learning events for gamification
    const { handleLearningEvent } = await import('./consumers/learning.consumer.ts');
    await kafkaClient.consume('gamification-service-learning', 'learning-events', handleLearningEvent).catch(err => {
      logger.error('Failed to subscribe to learning-events', err);
    });

    // Start Scheduler
    await import('./schedulers/streak-scheduler.ts').then(m => m.startStreakScheduler());
    
    httpServer.listen(PORT, () => {
      logger.info(`Gamification Service running on port ${PORT}`, { service: 'gamification-service' });
      logger.info(`WebSocket server ready for leaderboard updates`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
  }
};

startServer();
