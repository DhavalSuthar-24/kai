import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('user-consumer');

export const handleUserCreated = async (message: any) => {
  try {
    const { type, data } = message;

    if (type === 'USER_CREATED') {
      logger.info('Processing USER_CREATED event', { userId: data.userId });

      // Initialize default "General" topic for the new user
      await prisma.topic.create({
        data: {
          name: 'General',
          userId: data.userId,
        }
      });

      logger.info('Initialized default topic for user', { userId: data.userId });
    }
  } catch (error) {
    logger.error('Error handling user event', error);
  }
};
