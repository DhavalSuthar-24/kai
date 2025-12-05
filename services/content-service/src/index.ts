import dotenv from 'dotenv';
dotenv.config();

import app from './app.ts';
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
import kafkaClient from './kafka.ts';
import { handleLearningEvent } from './consumers/learning-consumer.ts';
import './workers/video-worker.ts'; // Start video worker
import contentRoutes from './routes/content.routes.ts';
import screenshotRoutes from './routes/screenshot.routes';
import recommendationRoutes from './routes/recommendation.routes';
import documentRoutes from './routes/document.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import { startAnalysisScheduler } from './schedulers/analysis.scheduler.ts';
import { startCleanupJob } from './schedulers/cleanup.scheduler.ts';
import { startDocumentProcessingWorker } from './workers/document-processing.worker';

const logger = createLogger('content-service');

// Initialize Sentry for error tracking
initializeSentry({ serviceName: 'content-service' });

// Validate environment configuration on startup
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

// Start background jobs
startAnalysisScheduler();

const PORT = process.env.PORT || 3002;

// Metrics collector
const metrics = createMetricsCollector('content_service');

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

app.use('/content', contentRoutes);
app.use('/screenshots', screenshotRoutes);
app.use('/content', recommendationRoutes); // /content/recommend
app.use('/documents', documentRoutes);
app.use('/marketplace', marketplaceRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.registry.contentType);
  res.end(await metrics.getMetrics());
});

// Health check endpoint
import prisma from './prisma.ts';
import { createHealthCheckHandler, createDatabaseHealthCheck, createKafkaHealthCheck } from '@shared/index.ts';

app.get('/health', await createHealthCheckHandler('content-service', [
  createDatabaseHealthCheck(prisma as any),
  createKafkaHealthCheck(kafkaClient),
]));

app.use(errorHandler as any);

const startServer = async () => {
  try {
    await kafkaClient.connectProducer().catch((err: any) => {
        logger.error('Failed to connect to Kafka', err);
    });

    // Subscribe to learning-events
    await kafkaClient.consume('content-group', 'learning-events', handleLearningEvent).catch((err: any) => {
        logger.error('Failed to subscribe to Kafka topic', err);
    });
    // Start Schedulers and Workers
    startAnalysisScheduler();
    startCleanupJob();
    startDocumentProcessingWorker();

    app.listen(PORT, () => {
      logger.info(`Content Service running on port ${PORT}`, { service: 'content-service' });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
  }
};

startServer();
