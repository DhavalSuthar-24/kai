import { KafkaClient, withDLQ, createLogger } from '@shared/index.ts';

const logger = createLogger('example-consumer');
const kafka = new KafkaClient('example-service', [process.env.KAFKA_BROKERS || 'localhost:9092']);

/**
 * Example: Consumer with DLQ support
 * 
 * This shows how to wrap a consumer handler with DLQ functionality.
 * Failed messages will be automatically sent to the DLQ topic for retry.
 */

// Your business logic handler
async function processUserCreatedEvent(message: any) {
  const { type, data } = message;
  
  if (type !== 'USER_CREATED') {
    throw new Error(`Unexpected event type: ${type}`);
  }
  
  logger.info('Processing USER_CREATED event', { userId: data.id });
  
  // Simulate processing that might fail
  if (!data.email) {
    throw new Error('Email is required');
  }
  
  // Your actual business logic here
  // e.g., create user in database, send welcome email, etc.
  
  logger.info('User created successfully', { userId: data.id });
}

// Wrap handler with DLQ support
const wrappedHandler = withDLQ(
  kafka,
  'user-events',
  processUserCreatedEvent,
  {
    maxRetries: 3,
    retryDelay: 5000,
    enabled: true
  }
);

// Start consuming
export async function startConsumer() {
  await kafka.connectProducer();
  await kafka.consume('example-service-group', 'user-events', wrappedHandler);
  logger.info('Consumer started with DLQ support');
}

/**
 * Example: Manual DLQ processing
 * 
 * This shows how to manually process messages from the DLQ.
 * Useful for monitoring and reprocessing failed messages.
 */

import { KafkaDLQHandler } from '@shared/index.ts';

export async function processDLQMessages() {
  const dlqHandler = new KafkaDLQHandler(kafka, {
    maxRetries: 3,
    retryDelay: 5000
  });
  
  // Consume from DLQ topic
  await kafka.consume('example-dlq-processor', 'user-events.dlq', async (message) => {
    const dlqMessage = message.data;
    
    logger.info('Processing DLQ message', {
      originalTopic: dlqMessage.topic,
      retryCount: dlqMessage.retryCount
    });
    
    // Process with retry logic
    const success = await dlqHandler.processDLQMessage(
      dlqMessage,
      processUserCreatedEvent
    );
    
    if (success) {
      logger.info('DLQ message processed successfully');
    } else {
      logger.error('DLQ message processing failed permanently');
    }
  });
}

/**
 * Example: Error handling with categorization
 */

import { trackError, categorizeError, ErrorCategory } from '@shared/index.ts';

export async function exampleErrorHandling() {
  try {
    // Some operation that might fail
    throw new Error('Database connection failed');
  } catch (error) {
    // Track and categorize the error
    const categorized = trackError(error, {
      operation: 'user-creation',
      userId: '123'
    });
    
    // Check error type
    if (categorized.isRetryable()) {
      logger.warn('Retryable error, will retry', {
        category: categorized.category,
        message: categorized.getUserMessage()
      });
      // Implement retry logic
    } else if (categorized.isFatal()) {
      logger.error('Fatal error, alerting ops team', {
        category: categorized.category,
        stack: categorized.stack
      });
      // Send alert
    } else {
      logger.info('User error, returning to client', {
        category: categorized.category,
        message: categorized.getUserMessage()
      });
      // Return user-friendly message
    }
  }
}

/**
 * Example: Using resilient HTTP client
 */

import { services } from '@shared/index.ts';

export async function exampleResilientHTTPCall() {
  try {
    // This call has automatic retry logic and circuit breaker
    const result = await services.ai.post('/api/v1/process', {
      content: 'Some text to process'
    });
    
    logger.info('AI service call successful', result);
    return result;
  } catch (error) {
    // If all retries fail and circuit breaker is open,
    // the fallback response will be returned
    logger.error('AI service call failed, using fallback', error);
    
    // The error will be a categorized error
    const categorized = categorizeError(error);
    
    if (categorized.category === ErrorCategory.SERVICE_UNAVAILABLE) {
      // Circuit breaker is likely open
      logger.warn('AI service circuit breaker may be open');
    }
    
    throw categorized;
  }
}

/**
 * Example: Monitoring circuit breaker stats
 */

export function monitorCircuitBreakers() {
  const stats = [
    services.ai.getStats(),
    services.learning.getStats(),
    services.gamification.getStats()
  ].filter(Boolean);
  
  stats.forEach(stat => {
    logger.info('Circuit breaker stats', stat);
    
    if (stat?.state === 'OPEN') {
      logger.error(`Circuit breaker OPEN for ${stat.name}`, {
        stats: stat.stats
      });
      // Send alert
    }
  });
}

/**
 * Example: Error aggregation monitoring
 */

import { errorAggregator } from '@shared/index.ts';

export function logErrorStats() {
  const stats = errorAggregator.getStats();
  
  logger.info('Error statistics', {
    totalErrors: stats.totalErrors,
    byCategory: stats.byCategory,
    topErrors: stats.topErrors
  });
  
  // Reset stats after logging (e.g., every hour)
  errorAggregator.reset();
}
