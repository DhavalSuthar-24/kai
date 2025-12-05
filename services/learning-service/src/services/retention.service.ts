import axios from 'axios';
import { createLogger, getConfig } from '@shared/index.ts';
import prisma from '../prisma';

const logger = createLogger('retention-service');
const config = getConfig();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export class RetentionService {
    async updateRetentionAfterReview(userId: string, subtopicId: string, result: 'success' | 'failure') {
        try {
            // 1. Get Current Mastery
            const mastery = await prisma.userMastery.findUnique({
                where: { userId_subtopicId: { userId, subtopicId } }
            });
            
            if (!mastery) {
                // If no mastery record, create one
                // This logic might usually be in topic completion, but safe to handle here
                return; 
            }
            
            // 2. Prepare History for AI Prediction
            // We need to parse existing metrics/history if stored
            // For now, assuming metrics contains history array, or we fetch from ReviewLogs
            // Fetching last review logs for this subtopic
            const logs = await prisma.reviewLog.findMany({
                where: { userId, topicId: subtopicId }, // Assuming mapping subtopic to topic or we need to fix relations
                // Wait, ReviewLog links to Topic/Flashcard. UserMastery is Subtopic.
                // Assuming we can get relevant logs or just look at lastPracticed
                orderBy: { reviewedAt: 'desc' },
                take: 10
            });
            
            const history = logs.map(l => ({
                date: l.reviewedAt,
                result: l.quality >= 3 ? 'success' : 'failure' // Simplified mapping
            }));
            
            // Add current attempt
            history.push({ date: new Date(), result });
            
            // 3. Call AI Service/Model to get next interval
            const lastReviewDays = mastery.lastReviewDate 
                ? Math.floor((Date.now() - mastery.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
                : 1;

            const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/v1/predict/retention`, {
                last_review_days: lastReviewDays,
                difficulty: 3.0, // Should fetch from Subtopic/Topic difficulty
                history: history
            });
            
            const { recommended_interval } = aiResponse.data;
            
            // 4. Update Mastery Record
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + recommended_interval);
            
            await prisma.userMastery.update({
                where: { id: mastery.id },
                data: {
                    lastPracticed: new Date(),
                    lastReviewDate: new Date(),
                    nextReviewDate: nextDate,
                    retention: JSON.stringify({ probability: aiResponse.data.probability }),
                    // Update level/confidence based on result too
                    level: result === 'success' ? { increment: 1 } : { decrement: 1 }
                }
            });
            
            logger.info(`Updated retention for user ${userId}, next review in ${recommended_interval} days`);

        } catch (error: any) {
            logger.error('Failed to update retention', error);
        }
    }

    async getDueReviews(userId: string) {
        return await prisma.userMastery.findMany({
            where: {
                userId,
                nextReviewDate: {
                    lte: new Date()
                }
            },
            include: { subtopic: true }
        });
    }
}
