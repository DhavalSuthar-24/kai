import admin from 'firebase-admin';
import { createLogger } from '@shared/index.ts';
import { readFileSync } from 'fs';

const logger = createLogger('firebase-service');

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionButtons?: Array<{
    title: string;
    action: string;
    icon?: string;
  }>;
}

export class FirebaseService {
  private initialized: boolean = false;
  private app?: admin.app.App;

  constructor(serviceAccountPath?: string) {
    if (!serviceAccountPath || serviceAccountPath === './firebase-service-account.json') {
      logger.warn('Firebase service account not configured, push notifications will be mocked');
      this.initialized = false;
    } else {
      try {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.initialized = true;
        logger.info('Firebase service initialized');
      } catch (error) {
        logger.error('Failed to initialize Firebase', error);
        this.initialized = false;
      }
    }
  }

  /**
   * Send push notification to a single device token
   */
  async sendPushNotification(
    token: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized) {
      // Mock mode
      logger.info('MOCK: Sending push notification', { token, title: payload.title });
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
      };
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            // Map action buttons to Android actions if provided
            // Note: This is a simplified mapping. Real implementation might need more details.
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: payload.actionButtons ? 'WITH_ACTIONS' : undefined,
            },
          },
        },
      };

      // If action buttons exist, we might need to pass them in data for the client to handle
      // or configure platform specific fields. For now, let's pass them in data.
      if (payload.actionButtons) {
        if (!message.data) message.data = {};
        message.data.actions = JSON.stringify(payload.actionButtons);
      }

      const messageId = await admin.messaging().send(message);

      logger.info('Push notification sent successfully', {
        token: token.substring(0, 20) + '...',
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error: unknown) {
      const err = error as { message: string; code?: string };
      logger.error('Failed to send push notification', {
        token: token.substring(0, 20) + '...',
        error: err.message,
        code: err.code,
      });

      // Check if token is invalid
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'INVALID_TOKEN',
        };
      }

      return {
        success: false,
        error: err.message || 'Unknown error',
      };
    }
  }

  /**
   * Send push notification to multiple device tokens
   */
  async sendMulticastPushNotification(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (!this.initialized) {
      // Mock mode
      logger.info('MOCK: Sending multicast push notification', {
        tokenCount: tokens.length,
        title: payload.title,
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        successCount: tokens.length,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    if (tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      logger.info('Multicast push notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokenCount: invalidTokens.length,
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error: unknown) {
      logger.error('Failed to send multicast push notification', error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<number> {
    if (!this.initialized) {
      logger.info('MOCK: Subscribing to topic', { tokenCount: tokens.length, topic });
      return tokens.length;
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${response.successCount} tokens to topic ${topic}`);
      return response.successCount;
    } catch (error) {
      logger.error('Failed to subscribe to topic', error);
      return 0;
    }
  }

  /**
   * Check Firebase service health
   */
  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}
