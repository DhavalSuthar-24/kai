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
  errorHandler 
} from '@shared/index.ts';
import kafkaClient from './kafka';
import { handleContentEvent } from './consumers/content.consumer.ts';
import learningRoutes from './routes/learning.routes';
import { initializeFocusSocket } from './websocket/focus-socket';

const logger = createLogger('learning-service');

// Validate environment configuration on startup
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3003;

// Security middleware
app.use(correlationIdMiddleware);
app.use(createHelmetMiddleware());
app.use(createCorsMiddleware());
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
    await kafkaClient.consume('learning-group', 'content-group', handleContentEvent).catch((err: any) => {
        logger.error('Failed to subscribe to Kafka topic content-group', err);
    });

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket
    initializeFocusSocket(httpServer);

    // Start Scheduler
    await import('./schedulers/review-scheduler').then(m => m.startReviewScheduler());
    
    // Start Doomscroll Detector
    await import('./doomscroll-detector').then(m => m.startDoomscrollDetector());
    
    // Start Screenshot Processor
    await import('./screenshot-processor').then(m => m.startScreenshotProcessor());
    
    // Start Memory Scheduler
    await import('./schedulers/memory-scheduler').then(m => m.startMemoryScheduler());
    
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
