import { Request, Response } from 'express';
import { createLogger } from '@shared/index.ts';
import prisma from '../prisma.ts';

const logger = createLogger('preferences-controller');

/**
 * Get notification preferences for a user
 * GET /preferences/:userId
 */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Return default preferences
      return res.status(200).json({
        userId,
        kaizenReminders: true,
        doomscrollInterventions: true,
        memoryOfDay: true,
        friendChallenges: true,
        weeklyInsights: true,
        emailEnabled: true,
        pushEnabled: true,
      });
    }

    res.status(200).json(preferences);
  } catch (error: any) {
    logger.error('Failed to get preferences', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update notification preferences for a user
 * PUT /preferences/:userId
 */
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...updates,
      },
      update: updates,
    });

    logger.info('Updated notification preferences', { userId });

    res.status(200).json(preferences);
  } catch (error: any) {
    logger.error('Failed to update preferences', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unsubscribe from all notifications
 * POST /preferences/:userId/unsubscribe
 */
export const unsubscribeAll = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnabled: false,
        pushEnabled: false,
        kaizenReminders: false,
        doomscrollInterventions: false,
        memoryOfDay: false,
        friendChallenges: false,
        weeklyInsights: false,
      },
      update: {
        emailEnabled: false,
        pushEnabled: false,
        kaizenReminders: false,
        doomscrollInterventions: false,
        memoryOfDay: false,
        friendChallenges: false,
        weeklyInsights: false,
      },
    });

    logger.info('User unsubscribed from all notifications', { userId });

    res.status(200).json({ message: 'Successfully unsubscribed from all notifications' });
  } catch (error: any) {
    logger.error('Failed to unsubscribe', error);
    res.status(500).json({ error: error.message });
  }
};
