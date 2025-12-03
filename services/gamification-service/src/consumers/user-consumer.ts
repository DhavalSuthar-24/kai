import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('gamification-consumer');

export const handleUserCreated = async (message: any) => {
  try {
    const { type, data } = message;

    if (type === 'USER_CREATED') {
      logger.info('Processing USER_CREATED event', { userId: data.id });

      await prisma.userProgress.create({
        data: {
            userId: data.id,
            points: 0,
            level: 1,
            streak: 0
        }
      });

      logger.info('Initialized UserProgress', { userId: data.id });
    }
  } catch (error) {
    logger.error('Error handling user event', error);
  }
};
