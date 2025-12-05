import { createLogger } from '@shared/index.ts';
import prisma from '../prisma.ts';

const logger = createLogger('screen-usage-consumer');

export async function handleScreenUsageEvent(message: any) {
  if (message.type !== 'SCREEN_USAGE_LOGGED') return;
  
  const { userId, appName, duration, timestamp } = message.data;
  
  try {
    // Log screen usage to database
    await prisma.screenUsageLog.create({
      data: {
        userId,
        appName,
        duration,
        timestamp: new Date(timestamp)
      }
    });
    
    logger.info(`Logged screen usage for user ${userId}: ${appName} (${duration}s)`);
    
    // Check for doomscroll patterns
    if (duration > 1800) { // 30 minutes
      logger.warn(`Potential doomscroll detected for user ${userId} on ${appName}`);
      
      // Could trigger intervention here
      await prisma.intervention.create({
        data: {
          userId,
          triggerReason: 'DOOMSCROLL_DETECTED',
          detectedApp: appName,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          metadata: JSON.stringify({ appName, duration })
        }
      });
    }
  } catch (error) {
    logger.error(`Failed to log screen usage for user ${userId}`, error);
  }
}
