import { Request, Response } from 'express';
import { createLogger } from '@shared/index.ts';
import { DeviceTokenService } from '../services/device-token.service.ts';
import { DevicePlatform } from '../types/notifications.ts';

const logger = createLogger('device-tokens-controller');
const deviceTokenService = new DeviceTokenService();

/**
 * Register a device token
 * POST /device-tokens
 */
export const registerToken = async (req: Request, res: Response) => {
  try {
    const { userId, token, platform } = req.body;

    if (!userId || !token || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: userId, token, platform',
      });
    }

    if (!Object.values(DevicePlatform).includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${Object.values(DevicePlatform).join(', ')}`,
      });
    }

    const result = await deviceTokenService.registerToken(userId, token, platform);

    if (result.success) {
      res.status(200).json({ message: 'Token registered successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    logger.error('Failed to register token', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unregister a device token
 * DELETE /device-tokens/:token
 */
export const unregisterToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    await deviceTokenService.unregisterToken(token);

    res.status(200).json({ message: 'Token unregistered successfully' });
  } catch (error: any) {
    logger.error('Failed to unregister token', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's device tokens
 * GET /device-tokens/:userId
 */
export const getUserTokens = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const tokens = await deviceTokenService.getUserTokens(userId);

    res.status(200).json({ tokens });
  } catch (error: any) {
    logger.error('Failed to get user tokens', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get token statistics for a user
 * GET /device-tokens/:userId/stats
 */
export const getTokenStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const stats = await deviceTokenService.getUserTokenStats(userId);

    res.status(200).json(stats);
  } catch (error: any) {
    logger.error('Failed to get token stats', error);
    res.status(500).json({ error: error.message });
  }
};
