import prisma from '../prisma';
import kafkaClient from '../kafka';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('screen-time-service');

export class ScreenTimeService {
  async captureScreenTime(data: {
    userId: string;
    timestamp: Date;
    appPackageName: string;
    sessionDuration: number;
    interactionCount: number;
    scrollDistance: number;
    contextSwitches: number;
    timeOfDay: string;
    dayType: string;
    batteryLevel: number;
    location?: string;
  }) {
    try {
      // 1. Save to TimescaleDB (Prisma)
      const event = await prisma.screenTimeEvent.create({
        data: {
          userId: data.userId,
          timestamp: data.timestamp,
          appPackageName: data.appPackageName,
          sessionDuration: data.sessionDuration,
          interactionCount: data.interactionCount,
          scrollDistance: data.scrollDistance,
          contextSwitches: data.contextSwitches,
          timeOfDay: data.timeOfDay,
          dayType: data.dayType,
          batteryLevel: data.batteryLevel,
          location: data.location,
        },
      });

      // 2. Publish to Kafka
      await kafkaClient.send('screen-time-events', [{
        type: 'SCREEN_TIME_CAPTURED',
        data: event,
      }]);

      logger.info(`Captured screen time event for user ${data.userId} app ${data.appPackageName}`);
      return event;
    } catch (error) {
      logger.error('Failed to capture screen time event', error);
      throw error;
    }
  }
}
