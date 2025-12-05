import type { ScreenUsageLog } from '../../prisma/generated';
import prisma from '../prisma.ts';
import kafkaClient from '../kafka.ts';
import { createLogger, RedisClient } from '@shared/index.ts';

const logger = createLogger('doomscroll-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

const DOOMSCROLL_APPS = ['Instagram', 'TikTok', 'Twitter', 'X', 'Facebook', 'YouTube', 'Reddit', 'Snapchat'];
const DOOMSCROLL_THRESHOLD_SECONDS = 15 * 60; // 15 minutes
const COOLDOWN_SECONDS = 30 * 60; // 30 minutes cooldown between alerts

interface UsageMetadata {
  scrollVelocity?: number; // pixels per second
  interactionRate?: number; // interactions per minute
  scrollDistance?: number;
}

export class DoomscrollService {
  
  /**
   * Analyzes a batch of usage logs for a specific user to detect doomscrolling.
   * @param userId The user ID to analyze
   * @param logs Recent screen usage logs
   */
  async analyzeSession(userId: string, logs: ScreenUsageLog[]) {
    try {
      if (!logs || logs.length === 0) return;

      // 1. Check if current app is a potential doomscroll app
      const latestLog = logs[logs.length - 1];
      if (!latestLog) return; // Explicit check for TS

      if (!this.isDoomscrollApp(latestLog.appName)) {
        await this.clearDoomscrollState(userId);
        return;
      }

      // 2. Calculate total continuous duration in this app
      const duration = await this.calculateContinuousDuration(userId, latestLog);
      
      // 3. Check if duration exceeds threshold
      if (duration >= DOOMSCROLL_THRESHOLD_SECONDS) {
        
        // 4. Check interaction patterns (if metadata available)
        const isMindless = this.analyzeInteractionPattern(latestLog);
        
        if (isMindless) {
           await this.triggerIntervention(userId, latestLog, duration);
        }
      }

    } catch (error) {
      logger.error('Error analyzing doomscroll session', error);
    }
  }

  private isDoomscrollApp(appName: string): boolean {
    return DOOMSCROLL_APPS.some(app => appName.toLowerCase().includes(app.toLowerCase()));
  }

  private async calculateContinuousDuration(userId: string, latestLog: ScreenUsageLog): Promise<number> {
    const key = `user:${userId}:current_app_session`;
    const sessionData = await redis.get(key);
    
    let currentDuration = latestLog.duration;
    let startTime = Date.now() - (latestLog.duration * 1000);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.appName === latestLog.appName) {
        // Continue session
        startTime = session.startTime;
        currentDuration = Math.floor((Date.now() - startTime) / 1000);
      }
    }

    // Update session in Redis
    await redis.set(key, JSON.stringify({
      appName: latestLog.appName,
      startTime: startTime,
      lastUpdate: Date.now()
    }), 300); // Expire after 5 mins of inactivity

    return currentDuration;
  }

  private analyzeInteractionPattern(log: ScreenUsageLog): boolean {
    if (!log.metadata) return true; // Default to true if no metadata (assume worst)

    try {
      const metadata: UsageMetadata = JSON.parse(log.metadata);
      
      // High scroll velocity + Low interaction rate = Doomscrolling
      // These thresholds would need tuning
      const HIGH_SCROLL_VELOCITY = 500; // pixels/sec
      const LOW_INTERACTION_RATE = 2; // clicks/min

      if (metadata.scrollVelocity && metadata.scrollVelocity > HIGH_SCROLL_VELOCITY) {
        if (!metadata.interactionRate || metadata.interactionRate < LOW_INTERACTION_RATE) {
          return true;
        }
      }
      
      return true; // For now, be aggressive in detection if duration is high
    } catch (e) {
      return true;
    }
  }

  private async triggerIntervention(userId: string, log: ScreenUsageLog, duration: number) {
    const cooldownKey = `user:${userId}:doomscroll_cooldown`;
    const inCooldown = await redis.get(cooldownKey);

    if (inCooldown) {
      logger.info(`Skipping doomscroll alert for user ${userId} (cooldown)`);
      return;
    }

    logger.info(`Doomscroll detected for user ${userId} on ${log.appName} (${duration}s)`);

    // Publish event
    await kafkaClient.send('content-events', [{
      type: 'DOOMSCROLL_DETECTED',
      payload: {
        userId,
        appName: log.appName,
        duration,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      }
    }]);

    // Set cooldown
    await redis.set(cooldownKey, 'true', COOLDOWN_SECONDS);
  }

  private async clearDoomscrollState(userId: string) {
    await redis.del(`user:${userId}:current_app_session`);
  }
}

export const doomscrollService = new DoomscrollService();
