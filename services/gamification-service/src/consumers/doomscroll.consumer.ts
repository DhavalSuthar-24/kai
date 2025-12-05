import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('doomscroll-consumer');

interface DoomscrollMessage {
  type: string;
  payload?: {
    userId: string;
    appName: string;
    duration: number;
    timestamp: string;
    severity: string;
  };
  // Fallback for flat message structure
  userId?: string;
  appName?: string;
  duration?: number;
  timestamp?: string;
  severity?: string;
}

export const handleDoomscrollEvent = async (message: DoomscrollMessage) => {
  try {
    const data = message.payload || message;
    const { userId, appName, severity } = data;

    if (!userId || !appName) {
        logger.warn('Invalid doomscroll event received', { message });
        return;
    }

    logger.info('Processing DOOMSCROLL_DETECTED event', { userId, appName });

    // 1. Record the event - MOVED TO LEARNING SERVICE
    // Logic handled by learning-service/src/services/doomscroll.service.ts

    // 2. Apply penalty (optional, for now just log)
    // Could deduct points or break streak if severity is HIGH
    if (severity === 'HIGH') {
        logger.info(`High severity doomscroll detected for ${userId}. Potential streak penalty.`);
    }

  } catch (error) {
    logger.error('Error handling doomscroll event', error);
  }
};
