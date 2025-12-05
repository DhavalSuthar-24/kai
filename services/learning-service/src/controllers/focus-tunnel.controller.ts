import type { Response } from 'express';
import type { AuthRequest } from '@shared/index';
import { successResponse } from '@shared/index';
import { asyncHandler } from '@shared/index';
import {
  startFocusSession,
  endFocusSession,
  abandonFocusSession,
  getActiveSession,
  getFocusHistory
} from '../services/focus-session.service';
import kafkaClient from '../kafka';

export const startFocus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { duration, topic, allowedApps, blockedApps } = req.body;

  // Check if there's already an active session
  const existingSession = await getActiveSession(userId);
  if (existingSession) {
    return res.status(400).json({
      success: false,
      message: 'You already have an active focus session'
    });
  }

  const session = await startFocusSession(userId, {
    duration: duration || 25,
    topic,
    allowedApps,
    blockedApps
  });

  res.json(successResponse(session, 'Focus session started'));
});

export const endFocus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { sessionId } = req.body;

  const session = await endFocusSession(sessionId);

  // Publish event for gamification
  await kafkaClient.send('focus-events', [{
    type: 'FOCUS_SESSION_COMPLETED',
    data: {
      userId,
      sessionId: session.id,
      duration: session.actualDuration,
      interruptions: session.interruptions,
      pomodoroCount: session.pomodoroCount
    }
  }]);

  res.json(successResponse(session, 'Focus session completed'));
});

export const abandonFocus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.body;

  const session = await abandonFocusSession(sessionId);

  res.json(successResponse(session, 'Focus session abandoned'));
});

export const getActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = await getActiveSession(userId);

  res.json(successResponse(session, 'Active session retrieved'));
});

export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { limit = '20' } = req.query;

  const sessions = await getFocusHistory(userId, parseInt(limit as string));

  res.json(successResponse(sessions, 'Focus history retrieved'));
});
