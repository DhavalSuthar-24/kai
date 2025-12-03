import kafkaClient from './kafka';
import { prisma } from './prisma';
import type { EachMessagePayload } from 'kafkajs';

const SOCIAL_MEDIA_APPS = ['Instagram', 'Twitter', 'Facebook', 'TikTok', 'Reddit', 'Snapchat'];
const DOOMSCROLL_THRESHOLD_SECONDS = 300; // 5 minutes

interface ScreenUsageEvent {
  userId: string;
  appName: string;
  category?: string;
  duration: number;
  timestamp: Date;
  logId: string;
}

export async function startDoomscrollDetector() {
  // Use the KafkaClient's consume method instead of raw Kafka consumer
  await kafkaClient.consume('doomscroll-detector', 'SCREEN_USAGE_LOGGED', async (message: any) => {
    const event: ScreenUsageEvent = message;
    await analyzeDoomscroll(event);
  });
  
  console.log('🔍 Doomscroll Detector started');
}

async function analyzeDoomscroll(event: ScreenUsageEvent) {
  const { userId, appName, duration } = event;

  // Check if app is social media
  const isSocialMedia = SOCIAL_MEDIA_APPS.includes(appName) || event.category === 'SOCIAL_MEDIA';

  if (!isSocialMedia) {
    return; // Not a doomscroll candidate
  }

  // Get recent usage for this user in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  // Check if there's already a pending intervention
  const existingIntervention = await prisma.intervention.findFirst({
    where: {
      userId,
      status: 'PENDING',
      expiresAt: {
        gte: new Date(),
      },
    },
  });

  if (existingIntervention) {
    return; // Don't spam interventions
  }

  // Simple heuristic: if this single session is > 5 minutes, trigger
  if (duration >= DOOMSCROLL_THRESHOLD_SECONDS) {
    await createIntervention(userId, appName);
  }
}

async function createIntervention(userId: string, detectedApp: string) {
  // Get a flashcard that's due for review
  const dueFlashcard = await prisma.flashcard.findFirst({
    where: {
      nextReview: {
        lte: new Date(),
      },
    },
    orderBy: {
      nextReview: 'asc',
    },
  });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  const intervention = await prisma.intervention.create({
    data: {
      userId,
      triggerReason: 'DOOMSCROLL_DETECTED',
      detectedApp,
      status: 'PENDING',
      contentType: dueFlashcard ? 'FLASHCARD' : 'TOPIC',
      contentId: dueFlashcard?.id || null,
      contentPreview: dueFlashcard ? dueFlashcard.front : 'Time to learn something new!',
      expiresAt,
    },
  });

  console.log(`🚨 Intervention created for user ${userId} (detected ${detectedApp})`);

  // Publish event for Notification Service
  await kafkaClient.send('INTERVENTION_TRIGGERED', [{
    userId,
    interventionId: intervention.id,
    detectedApp,
    contentType: intervention.contentType,
    contentPreview: intervention.contentPreview,
  }]);
}
