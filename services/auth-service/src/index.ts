import dotenv from 'dotenv';
dotenv.config();

import app from './app.ts';
import express from 'express';
import { 
  createLogger, 
  validateConfig, 
  correlationIdMiddleware,
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiter,
  createMetricsCollector,
  initializeSentry,
  errorHandler 
} from '@shared/index.ts';
import kafkaClient from './kafka.ts';
import authRoutes from './routes/auth.routes.ts';
import privacyRoutes from './routes/privacy.routes.ts';

import { configurePassport } from './passport.ts';
import passport from 'passport';

const logger = createLogger('auth-service');

// Initialize Sentry for error tracking
initializeSentry({ serviceName: 'auth-service' });

// Configure Passport
configurePassport();

// Validate environment configuration on startup
try {
  validateConfig();
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Metrics collector
const metrics = createMetricsCollector('auth_service');

// Security middleware
app.use(correlationIdMiddleware);
app.use(createHelmetMiddleware());
app.use(createCorsMiddleware());
app.use(express.json());
app.use(passport.initialize());
// Metrics middleware (before routes)
app.use(metrics.middleware());

// Global rate limiter (100 requests per 15 minutes per IP)
app.use(createRateLimiter());

// Request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, { 
    correlationId: (req as any).correlationId,
    ip: req.ip 
  });
  next();
});

app.use('/auth', authRoutes);
app.use('/privacy', privacyRoutes);

// Health check endpoint
import prisma from './prisma.ts';
import { createHealthCheckHandler, createDatabaseHealthCheck, createKafkaHealthCheck } from '@shared/index.ts';

app.get('/health', await createHealthCheckHandler('auth-service', [
  createDatabaseHealthCheck(prisma as any),
  createKafkaHealthCheck(kafkaClient),
]));

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.registry.contentType);
  res.end(await metrics.getMetrics());
});

app.use(errorHandler as any);

const startServer = async () => {
  try {
    // Only connect if KAFKA_ENABLED is true or just try and log error
    // For now, we assume Kafka is available or we handle error gracefully
    await kafkaClient.connectProducer().catch(err => {
        logger.error('Failed to connect to Kafka', err);
    });
    
    app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`, { service: 'auth-service' });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
  }
};

startServer();
