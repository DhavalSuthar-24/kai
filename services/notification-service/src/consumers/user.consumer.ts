import { createLogger } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

const logger = createLogger('user-notification-consumer');

export async function handleUserNotificationEvent(message: any) {
  const eventType = message.type;
  
  try {
    switch (eventType) {
      case 'USER_CREATED':
        await handleUserCreated(message.data);
        break;
      case 'EMAIL_VERIFICATION_REQUESTED':
        await handleEmailVerification(message.data);
        break;
      case 'PASSWORD_RESET_REQUESTED':
        await handlePasswordReset(message.data);
        break;
      default:
        // Ignore other events
        break;
    }
  } catch (error) {
    logger.error(`Failed to handle user notification event: ${eventType}`, error);
  }
}

async function handleUserCreated(data: any) {
  const { id, email, name } = data;
  
  logger.info(`Sending welcome email to user ${id}: ${email}`);
  
  // Send welcome email
  await kafkaClient.send('notification-events', [{
    type: 'NOTIFICATION_REQUESTED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      userId: id,
      channel: 'EMAIL',
      title: 'Welcome to Kai! 🎓',
      body: `Hi ${name}, welcome to your personalized learning journey!`,
      template: 'WELCOME_EMAIL',
      data: {
        name,
        email
      }
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'notification-service'
    }
  }]);
}

async function handleEmailVerification(data: any) {
  const { userId, email, token } = data;
  
  logger.info(`Sending email verification to user ${userId}: ${email}`);
  
  await kafkaClient.send('notification-events', [{
    type: 'NOTIFICATION_REQUESTED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      userId,
      channel: 'EMAIL',
      title: 'Verify Your Email',
      body: 'Please verify your email address to continue.',
      template: 'EMAIL_VERIFICATION',
      data: {
        email,
        verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${token}`
      }
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'notification-service'
    }
  }]);
}

async function handlePasswordReset(data: any) {
  const { userId, email, token } = data;
  
  logger.info(`Sending password reset to user ${userId}: ${email}`);
  
  await kafkaClient.send('notification-events', [{
    type: 'NOTIFICATION_REQUESTED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      userId,
      channel: 'EMAIL',
      title: 'Reset Your Password',
      body: 'You requested to reset your password.',
      template: 'PASSWORD_RESET',
      data: {
        email,
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${token}`
      }
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'notification-service'
    }
  }]);
}
