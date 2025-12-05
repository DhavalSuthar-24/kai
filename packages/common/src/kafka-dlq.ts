import { createLogger } from './logger.ts';
import type { KafkaClient } from './kafka.ts';

const logger = createLogger('kafka-dlq');

export interface DLQMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: any;
  headers?: Record<string, string>;
  error: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
  retryCount: number;
  originalTimestamp: Date;
}

export interface DLQOptions {
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  enabled?: boolean;
}

export class KafkaDLQHandler {
  private maxRetries: number;
  private retryDelay: number;
  private enabled: boolean;
  
  constructor(
    private kafka: KafkaClient,
    options: DLQOptions = {}
  ) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.enabled = options.enabled !== false;
  }
  
  /**
   * Send a failed message to the DLQ
   */
  async sendToDLQ(
    originalTopic: string,
    message: any,
    error: Error,
    retryCount: number = 0
  ): Promise<void> {
    if (!this.enabled) {
      logger.warn('DLQ is disabled, message will be lost', { topic: originalTopic });
      return;
    }
    
    const dlqTopic = `${originalTopic}.dlq`;
    
    const dlqMessage: DLQMessage = {
      topic: originalTopic,
      partition: message.partition || 0,
      offset: message.offset || '0',
      key: message.key || null,
      value: message.value,
      headers: message.headers,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      },
      retryCount,
      originalTimestamp: message.timestamp || new Date()
    };
    
    try {
      await this.kafka.publishEvent(dlqTopic, {
        type: 'DLQ_MESSAGE',
        data: dlqMessage
      });
      
      logger.info(`Message sent to DLQ: ${dlqTopic}`, {
        originalTopic,
        retryCount,
        error: error.message
      });
    } catch (dlqError) {
      logger.error('Failed to send message to DLQ', {
        originalTopic,
        dlqTopic,
        error: dlqError
      });
    }
  }
  
  /**
   * Process a message from the DLQ with retry logic
   */
  async processDLQMessage(
    dlqMessage: DLQMessage,
    handler: (message: any) => Promise<void>
  ): Promise<boolean> {
    const { topic, value, retryCount } = dlqMessage;
    
    if (retryCount >= this.maxRetries) {
      logger.error('Max retries exceeded for DLQ message', {
        topic,
        retryCount,
        maxRetries: this.maxRetries
      });
      
      // Send to permanent failure topic
      await this.sendToFailureTopic(dlqMessage);
      return false;
    }
    
    // Wait before retry
    if (retryCount > 0) {
      const delay = this.calculateRetryDelay(retryCount);
      logger.info(`Waiting ${delay}ms before retry`, { topic, retryCount });
      await this.sleep(delay);
    }
    
    try {
      await handler(value);
      logger.info('DLQ message processed successfully', { topic, retryCount });
      return true;
    } catch (error) {
      logger.error('DLQ message processing failed', {
        topic,
        retryCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Send back to DLQ with incremented retry count
      await this.sendToDLQ(
        topic,
        { value, partition: dlqMessage.partition, offset: dlqMessage.offset },
        error instanceof Error ? error : new Error('Unknown error'),
        retryCount + 1
      );
      
      return false;
    }
  }
  
  /**
   * Send permanently failed message to failure topic
   */
  private async sendToFailureTopic(dlqMessage: DLQMessage): Promise<void> {
    const failureTopic = `${dlqMessage.topic}.failed`;
    
    try {
      await this.kafka.publishEvent(failureTopic, {
        type: 'PERMANENT_FAILURE',
        data: dlqMessage
      });
      
      logger.warn(`Message sent to permanent failure topic: ${failureTopic}`, {
        originalTopic: dlqMessage.topic,
        retryCount: dlqMessage.retryCount
      });
    } catch (error) {
      logger.error('Failed to send to permanent failure topic', {
        topic: failureTopic,
        error
      });
    }
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    return Math.min(this.retryDelay * Math.pow(2, retryCount - 1), 60000); // Max 60s
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get DLQ stats for monitoring
   */
  async getDLQStats(topic: string): Promise<{
    dlqCount: number;
    failedCount: number;
  }> {
    // This would require Kafka admin API to get topic stats
    // For now, return placeholder
    return {
      dlqCount: 0,
      failedCount: 0
    };
  }
}

/**
 * Wrapper for consumer handlers with DLQ support
 */
export function withDLQ(
  kafka: KafkaClient,
  topic: string,
  handler: (message: any) => Promise<void>,
  options?: DLQOptions
) {
  const dlqHandler = new KafkaDLQHandler(kafka, options);
  
  return async (message: any) => {
    try {
      await handler(message);
    } catch (error) {
      logger.error(`Consumer error for topic ${topic}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await dlqHandler.sendToDLQ(
        topic,
        message,
        error instanceof Error ? error : new Error('Unknown error'),
        0
      );
    }
  };
}

export default KafkaDLQHandler;
