import prisma from '../prisma';
import kafkaClient from '../kafka';
import { createLogger, getConfig } from '@shared/index.ts';

const logger = createLogger('gamification-service');

export class GamificationService {
    
    /**
     * Process an event (e.g., TOPIC_COMPLETED) and award XP/Achievements
     */
    async processEvent(userId: string, eventType: string, data: any) {
        logger.info(`Processing event ${eventType} for user ${userId}`);
        
        try {
            // 1. Award XP based on event type
            let xpToAward = 0;
            if (eventType === 'TOPIC_COMPLETED') xpToAward = 100;
            else if (eventType === 'QUIZ_PERFECT') xpToAward = 50;
            else if (eventType === 'SESSION_COMPLETED') xpToAward = 20;
            
            if (xpToAward > 0) {
                await this.awardXP(userId, xpToAward);
            }
            
            // 2. Check & Unlock Achievements
            await this.checkAchievements(userId, eventType, data);
            
        } catch (error) {
            logger.error('Error processing gamification event', error);
        }
    }

    async awardXP(userId: string, amount: number) {
        // Get or create progress
        let progress = await prisma.userProgress.findUnique({ where: { userId } });
        if (!progress) {
             progress = await prisma.userProgress.create({
                 data: { userId, points: 0, level: 1 }
             });
        }
        
        const newPoints = progress.points + amount;
        
        // Calculate Level (Simple formula: Level = floor(sqrt(points / 100)) + 1 or similar)
        // Let's use: Level = 1 + floor(points / 1000)
        const newLevel = 1 + Math.floor(newPoints / 1000);
        
        if (newLevel > progress.level) {
            // Level Up!
            await kafkaClient.send('gamification-events', [{
                type: 'LEVEL_UP',
                data: { userId, oldLevel: progress.level, newLevel }
            }]);
            logger.info(`User ${userId} leveled up to ${newLevel}`);
        }
        
        await prisma.userProgress.update({
            where: { userId },
            data: { points: newPoints, level: newLevel }
        });
    }

    async checkAchievements(userId: string, eventType: string, data: any) {
        // Fetch all potential achievements filtering by criteriaType corresponding to event
        // Needs mapping.
        // For MVP, just hardcode check for a few achievements or fetch all not unlocked.
        
        const unlockedIds = (await prisma.userAchievement.findMany({
            where: { userId },
            select: { achievementId: true }
        })).map(ua => ua.achievementId);
        
        const potential = await prisma.achievement.findMany({
            where: {
                id: { notIn: unlockedIds }
            }
        });
        
        for (const ach of potential) {
            let unlocked = false;
            
            if (ach.criteriaType === 'TOPIC_COUNT' && eventType === 'TOPIC_COMPLETED') {
                // Check total topics completed
                // We need to query Learning Service OR store stats in Gamification DB.
                // We have DailyActivity or UserProgress stats. 
                // For MVP, let's assume we pass current total in data or query a 'stats' table.
                // Or simplistic: if criteriaValue <= current session count (unlikely).
                
                // Better approach: We need a Stats model. For now, skipping complex criteria.
                // Simplest: "First Topic" -> criteriaValue = 1
                if (ach.criteriaValue === 1) unlocked = true; 
            }
            
            if (unlocked) {
                await prisma.userAchievement.create({
                    data: { userId, achievementId: ach.id }
                });
                
                await kafkaClient.send('gamification-events', [{
                    type: 'ACHIEVEMENT_UNLOCKED',
                    data: { userId, achievement: ach }
                }]);
                
                logger.info(`User ${userId} unlocked ${ach.name}`);
            }
        }
    }
}
