import { prisma } from '../prisma';
import { addMinutes, differenceInMinutes } from 'date-fns';
import { createLogger } from '@shared/index';

const logger = createLogger('focus-session-service');

interface FocusSessionConfig {
  duration: number; // minutes
  topic?: string;
  allowedApps?: string[];
  blockedApps?: string[];
}

export async function startFocusSession(userId: string, config: FocusSessionConfig) {
  logger.info(`Starting focus session for user ${userId}`);

  const session = await prisma.focusSession.create({
    data: {
      userId,
      duration: config.duration,
      topic: config.topic || null,
      allowedApps: JSON.stringify(config.allowedApps || []),
      blockedApps: JSON.stringify(config.blockedApps || []),
      status: 'ACTIVE'
    }
  });

  logger.info(`Focus session started: ${session.id}`);
  return session;
}

export async function endFocusSession(sessionId: string) {
  logger.info(`Ending focus session: ${sessionId}`);

  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId }
  });

  if (!session) {
    throw new Error('Focus session not found');
  }

  const actualDuration = differenceInMinutes(new Date(), session.startedAt);

  const updatedSession = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      actualDuration
    }
  });

  logger.info(`Focus session completed: ${sessionId}, duration: ${actualDuration} minutes`);
  return updatedSession;
}

export async function abandonFocusSession(sessionId: string) {
  logger.info(`Abandoning focus session: ${sessionId}`);

  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId }
  });

  if (!session) {
    throw new Error('Focus session not found');
  }

  const actualDuration = differenceInMinutes(new Date(), session.startedAt);

  const updatedSession = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: 'ABANDONED',
      endedAt: new Date(),
      actualDuration
    }
  });

  return updatedSession;
}

export async function trackInterruption(sessionId: string, appName: string) {
  logger.info(`Tracking interruption for session ${sessionId}: ${appName}`);

  const interruption = await prisma.focusInterruption.create({
    data: {
      sessionId,
      appName
    }
  });

  // Increment interruption count on session
  await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      interruptions: {
        increment: 1
      }
    }
  });

  return interruption;
}

export async function getActiveSession(userId: string) {
  const session = await prisma.focusSession.findFirst({
    where: {
      userId,
      status: 'ACTIVE'
    },
    orderBy: {
      startedAt: 'desc'
    }
  });

  return session;
}

export async function getFocusHistory(userId: string, limit: number = 20) {
  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: {
        in: ['COMPLETED', 'ABANDONED']
      }
    },
    orderBy: {
      startedAt: 'desc'
    },
    take: limit
  });

  return sessions;
}

export async function incrementPomodoroCount(sessionId: string) {
  await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      pomodoroCount: {
        increment: 1
      }
    }
  });
}
