import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { DevicePlatform } from '../types/notifications.ts';

const logger = createLogger('device-token-service');

export class DeviceTokenService {
  /**
   * Register a new device token for a user
   */
  async registerToken(
    userId: string,
    token: string,
    platform: DevicePlatform
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if token already exists
      const existing = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (existing) {
        // Update existing token
        await prisma.deviceToken.update({
          where: { token },
          data: {
            userId,
            platform,
            isActive: true,
            lastUsed: new Date(),
          },
        });

        logger.info('Updated existing device token', { userId, platform });
      } else {
        // Create new token
        await prisma.deviceToken.create({
          data: {
            userId,
            token,
            platform,
            isActive: true,
          },
        });

        logger.info('Registered new device token', { userId, platform });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to register device token', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterToken(token: string): Promise<void> {
    try {
      await prisma.deviceToken.update({
        where: { token },
        data: { isActive: false },
      });

      logger.info('Unregistered device token', { token: token.substring(0, 20) + '...' });
    } catch (error) {
      logger.error('Failed to unregister device token', error);
    }
  }

  /**
   * Get all active device tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await prisma.deviceToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          token: true,
        },
      });

      return tokens.map(t => t.token);
    } catch (error) {
      logger.error('Failed to get user tokens', error);
      return [];
    }
  }

  /**
   * Mark tokens as invalid (called when FCM returns invalid token error)
   */
  async markTokensInvalid(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    try {
      await prisma.deviceToken.updateMany({
        where: {
          token: {
            in: tokens,
          },
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Marked ${tokens.length} tokens as invalid`);
    } catch (error) {
      logger.error('Failed to mark tokens as invalid', error);
    }
  }

  /**
   * Update last used timestamp for a token
   */
  async updateLastUsed(token: string): Promise<void> {
    try {
      await prisma.deviceToken.update({
        where: { token },
        data: { lastUsed: new Date() },
      });
    } catch (error) {
      // Silently fail - not critical
      logger.debug('Failed to update last used', error);
    }
  }

  /**
   * Clean up inactive tokens (older than 90 days)
   */
  async cleanupInactiveTokens(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await prisma.deviceToken.deleteMany({
        where: {
          OR: [
            {
              isActive: false,
              updatedAt: {
                lt: ninetyDaysAgo,
              },
            },
            {
              lastUsed: {
                lt: ninetyDaysAgo,
              },
            },
          ],
        },
      });

      logger.info(`Cleaned up ${result.count} inactive device tokens`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup inactive tokens', error);
      return 0;
    }
  }

  /**
   * Get token statistics for a user
   */
  async getUserTokenStats(userId: string): Promise<{
    total: number;
    active: number;
    byPlatform: Record<string, number>;
  }> {
    try {
      const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: {
          isActive: true,
          platform: true,
        },
      });

      const byPlatform: Record<string, number> = {};
      let active = 0;

      tokens.forEach(token => {
        if (token.isActive) active++;
        byPlatform[token.platform] = (byPlatform[token.platform] || 0) + 1;
      });

      return {
        total: tokens.length,
        active,
        byPlatform,
      };
    } catch (error) {
      logger.error('Failed to get token stats', error);
      return { total: 0, active: 0, byPlatform: {} };
    }
  }
}
