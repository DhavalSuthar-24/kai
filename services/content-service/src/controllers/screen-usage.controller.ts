import type { Response } from 'express';
import type { AuthRequest } from '@shared/index';
import { prisma } from '../prisma';
import { successResponse } from '@shared/index';
import { asyncHandler } from '@shared/index';
import kafkaClient from '../kafka';
import { doomscrollService } from '../services/doomscroll.service';

export async function publishEvent(topic: string, data: any) {
  await kafkaClient.send(topic, [data]);
}

export const logScreenUsage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { appName, category, duration, metadata } = req.body;

  const usageLog = await prisma.screenUsageLog.create({
    data: {
      userId,
      appName,
      category,
      duration,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Trigger Doomscroll Analysis
  // We pass the new log as an array
  await doomscrollService.analyzeSession(userId, [usageLog]);

  // Publish event for Learning Service to analyze
  await publishEvent('SCREEN_USAGE_LOGGED', {
    userId,
    appName,
    category,
    duration,
    timestamp: usageLog.timestamp,
    logId: usageLog.id,
  });

  res.json(successResponse(usageLog, 'Screen usage logged'));
});
