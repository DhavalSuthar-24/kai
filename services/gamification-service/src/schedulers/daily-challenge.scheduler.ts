import { challengeService } from '../services/challenge.service.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('daily-challenge-scheduler');

export const generateDailyChallenge = async () => {
    logger.info('Generating daily challenge...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Creates a systemic daily challenge
    // We use a predefined "System" user ID or similar
    const SYSTEM_ADMIN_ID = 'system-admin'; 

    await challengeService.createChallenge(SYSTEM_ADMIN_ID, {
        title: `Daily Challenge: Review 30 Flashcards`,
        description: 'Complete 30 flashcard reviews today to earn 100 XP!',
        type: 'FLASHCARDS',
        target: 30,
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        isPublic: true
    });
};

export const startDailyChallengeScheduler = () => {
    // Run at midnight
    // For demo, just run once if none exists for today (logic inside createChallenge could handle dupes if refined)
    // Or just run it now.
    generateDailyChallenge();
    
    setInterval(generateDailyChallenge, 24 * 60 * 60 * 1000); // 24h
};
