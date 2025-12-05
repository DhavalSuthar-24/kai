import { createLogger } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

const logger = createLogger('learning-notification-consumer');

export async function handleLearningNotificationEvent(message: any) {
  const eventType = message.type;
  
  try {
    switch (eventType) {
      case 'CONTENT_LEARNING_PROCESSED':
        await handleContentProcessed(message.data);
        break;
      case 'TOPIC_CREATED':
        await handleTopicCreated(message.data);
        break;
      default:
        // Ignore other events
        break;
    }
  } catch (error) {
    logger.error(`Failed to handle learning notification event: ${eventType}`, error);
  }
}

async function handleContentProcessed(data: any) {
  const { userId, topicName, flashcardsGenerated, confidence } = data;
  
  logger.info(`Content processed for user ${userId}: topic=${topicName}, flashcards=${flashcardsGenerated}`);
  
  // Publish notification event
  if (topicName && flashcardsGenerated > 0) {
    await kafkaClient.send('notification-events', [{
      type: 'NOTIFICATION_REQUESTED',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        userId,
        channel: 'PUSH',
        title: 'Content Processed! 🎉',
        body: `We created ${flashcardsGenerated} flashcards for "${topicName}". Ready to study?`,
        data: {
          type: 'CONTENT_PROCESSED',
          topicName,
          flashcardsGenerated
        }
      },
      metadata: {
        correlationId: crypto.randomUUID(),
        source: 'learning-service'
      }
    }]);
    
    logger.info(`Notification sent for user ${userId}`);
  }
}

async function handleTopicCreated(data: any) {
  const { userId, name, autoCreated } = data;
  
  if (autoCreated) {
    logger.info(`Auto-created topic notification for user ${userId}: ${name}`);
    
    // Could send a notification about the new topic
    await kafkaClient.send('notification-events', [{
      type: 'NOTIFICATION_REQUESTED',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        userId,
        channel: 'IN_APP',
        title: 'New Topic Created',
        body: `We automatically created a topic for "${name}" based on your content.`,
        data: {
          type: 'TOPIC_CREATED',
          topicName: name
        }
      },
      metadata: {
        correlationId: crypto.randomUUID(),
        source: 'learning-service'
      }
    }]);
  }
}
