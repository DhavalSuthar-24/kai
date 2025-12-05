import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('gamification-consumer');

interface UserEvent {
  type: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED';
  data: {
    id?: string;
    userId?: string;
    email?: string;
    name?: string;
    timestamp?: string;
  };
}

export const handleUserCreated = async (message: UserEvent) => {
  try {
    const { type, data } = message;
    const userId = data.id || data.userId;

    if (!userId) {
      logger.warn('Received user event without userId', { type });
      return;
    }

    if (type === 'USER_CREATED') {
      if (!data.email) {
        logger.warn('Received USER_CREATED without email', { userId });
        return;
      }

      logger.info('Processing USER_CREATED event', { userId });

      await prisma.$transaction([
        prisma.user.create({
          data: {
            id: userId,
            email: data.email,
            name: data.name
          }
        }),
        prisma.userProgress.create({
          data: {
            userId: userId,
            points: 0,
            level: 1,
            streak: 0
          }
        })
      ]);

      logger.info('Initialized UserProgress', { userId });

    } else if (type === 'USER_UPDATED') {
      logger.info('Processing USER_UPDATED event', { userId });
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          email: data.email
        }
      });
      
      logger.info('Updated User', { userId });
      
    } else if (type === 'USER_DELETED') {
      logger.info('Processing USER_DELETED event', { userId });
      
      // Cascade delete is handled by database or we do it manually
      // For now, let's delete the user record which should cascade if configured, 
      // or we just delete the user and let other records be orphaned or handled later.
      // Given the schema, we might need to delete related records first if no cascade.
      // But for this task, let's just delete the user.
      
      await prisma.user.delete({
        where: { id: userId }
      });
      
      logger.info('Deleted User', { userId });
    }
  } catch (error) {
    logger.error('Error handling user event', error);
  }
};
