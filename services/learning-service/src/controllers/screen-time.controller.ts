import type { Request, Response } from 'express';
import { ScreenTimeService } from '../services/screen-time.service';
import { successResponse, errorResponse } from '@shared/index.ts';

const screenTimeService = new ScreenTimeService();

export class ScreenTimeController {
  async capture(req: Request, res: Response) {
    try {
      const {
        timestamp,
        appPackageName,
        sessionDuration,
        interactionCount,
        scrollDistance,
        contextSwitches,
        timeOfDay,
        dayType,
        batteryLevel,
        location,
      } = req.body;

      // Basic validation (can be enhanced with Zod)
      if (!appPackageName || sessionDuration === undefined) {
        res.status(400).json(errorResponse('Missing required fields'));
        return;
      }

      const result = await screenTimeService.captureScreenTime({
        userId: (req as any).user!.id, // Assumes auth middleware populates req.user
        timestamp: new Date(timestamp),
        appPackageName,
        sessionDuration,
        interactionCount,
        scrollDistance,
        contextSwitches,
        timeOfDay,
        dayType,
        batteryLevel,
        location,
      });

      res.status(200).json(successResponse(result, 'Screen time captured successfully'));
    } catch (err: any) {
      res.status(500).json(errorResponse(err.message, err));
    }
  }
}
