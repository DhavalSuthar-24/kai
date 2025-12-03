import { createLogger } from '@shared/index.ts';
import { challengeService } from '../services/challenge.service.ts';
import { RulesEngine } from '../services/rules-engine.ts';

const logger = createLogger('activity-consumer');
const rulesEngine = new RulesEngine();

export const handleActivityEvent = async (message: any) => {
  try {
    logger.info('Received activity event', { type: message.type });

    const { userId, payload } = message;
    
    // 1. Process Rules (Points, Badges)
    await rulesEngine.processEvent(userId, message.type, payload || message.data);

    // 2. Process Challenges
    switch (message.type) {
      case 'FLASHCARD_REVIEWED':
        // Payload might contain count, or just single review
        await challengeService.updateProgress(userId, 'FLASHCARDS', 1);
        break;
        
      case 'FOCUS_SESSION_COMPLETED':
        // Payload contains duration in minutes
        const duration = payload?.duration || 0;
        if (duration > 0) {
          await challengeService.updateProgress(userId, 'FOCUS_TIME', duration);
        }
        break;

      default:
        // Ignore other events for challenges
        break;
    }
  } catch (error) {
    logger.error('Error handling activity event', error);
  }
};
