import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app';
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
import kafkaClient from './kafka';
import learningRoutes from './routes/learning.routes';
import syllabusRoutes from './routes/syllabus.routes.ts';
import analyticsRoutes from './routes/analytics.routes.ts';
import dashboardRoutes from './routes/dashboard.routes';
import curriculumRoutes from './routes/curriculum.routes';
import deepDiveRoutes from './routes/deep-dive.routes';
import offlineRoutes from './routes/offline.routes.ts';
import screenTimeRoutes from './routes/screen-time.routes';
import mockTestRoutes from './routes/mock-test.routes.ts';
import feedRoutes from './routes/feed.routes.ts';
import { startContentGenWorker } from './workers/content-gen.worker';
import { startReviewSchedulerWorker, scheduleNightlyJob } from './workers/review-scheduler.worker';
import { handleUserCreated } from './consumers/user-consumer.ts';
import { handleContentCaptured } from './consumers/content-consumer.ts';
import { handleInterventionEvent } from './consumers/intervention.consumer.ts';
import { Server as SocketServer } from 'socket.io';
import { initializeFocusSocket } from './websocket/focus-socket';
import { initializeQuizSocket } from './websocket/quiz.socket';

const logger = createLogger('learning-service');

// Initialize Sentry for error tracking
initializeSentry({ serviceName: 'learning-service' });

// Kafka Consumers

// Validate environment configuration on startup
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3003;

// Metrics collector
const metrics = createMetricsCollector('learning_service');

// Security middleware
app.use(correlationIdMiddleware);
app.use(createHelmetMiddleware());
app.use(createCorsMiddleware());

// Metrics middleware (before routes)
app.use(metrics.middleware());

app.use(createRateLimiter());

// Request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    correlationId: (req as any).correlationId,
    ip: req.ip
  });
  next();
});

app.use('/learning', learningRoutes);
app.use('/syllabus', syllabusRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/curriculum', curriculumRoutes);
app.use('/deep-dive', deepDiveRoutes);
app.use('/offline', offlineRoutes);
app.use('/screen-time', screenTimeRoutes);
app.use('/mock-tests', mockTestRoutes);
app.use('/feed', feedRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.registry.contentType);
  res.end(await metrics.getMetrics());
});

// Health check endpoint
import prisma from './prisma';
import { createHealthCheckHandler, createDatabaseHealthCheck, createKafkaHealthCheck } from '@shared/index.ts';

app.get('/health', await createHealthCheckHandler('learning-service', [
  createDatabaseHealthCheck(prisma as any),
  createKafkaHealthCheck(kafkaClient),
]));

app.use(errorHandler as any);

const startServer = async () => {
  try {
    await kafkaClient.connectProducer().catch((err: any) => {
        logger.error('Failed to connect to Kafka Producer', err);
    });

    // Subscribe to content-group
    // Subscribe to topics
    await kafkaClient.consume('learning-service-users', 'user-events', handleUserCreated).catch((err: any) => {
        logger.error('Failed to subscribe to Kafka topic user-events', err);
    });

    await kafkaClient.consume('learning-service-content', 'content-events', handleContentCaptured).catch((err: any) => {
        logger.error('Failed to subscribe to Kafka topic content-events', err);
    });

    await kafkaClient.consume('learning-service-interventions', 'intervention-events', handleInterventionEvent).catch((err: any) => {
        logger.error('Failed to subscribe to Kafka topic intervention-events', err);
    });

    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize Socket.io
    const io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // Configure appropriately for production
        methods: ['GET', 'POST']
      }
    });

    // Initialize WebSockets
    initializeFocusSocket(io);
    initializeQuizSocket(io);

    // Start Scheduler
    
    // Start Doomscroll Detector
    await import('./doomscroll-detector').then(m => m.startDoomscrollDetector());
    
    // Start Screenshot Processor
    await import('./screenshot-processor').then(m => m.startScreenshotProcessor());
    
    // Start Memory Scheduler
    await import('./schedulers/memory-scheduler').then(m => m.startMemoryScheduler());
    
    // Start Intervention Worker
    await import('./workers/intervention.worker').then(m => m.startInterventionWorker());

    // Start Content Gen Worker
startContentGenWorker();
startReviewSchedulerWorker();
scheduleNightlyJob();

httpServer.listen(PORT, () => {
      logger.info(`Learning Service running on port ${PORT}`, { service: 'learning-service' });
      logger.info(`WebSocket server ready for focus sessions`);
    });
  } catch (error) {
    logger.error('Failed to start Learning Service', error);
    process.exit(1);
  }
};

startServer();
