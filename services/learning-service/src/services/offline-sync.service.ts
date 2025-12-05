import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('offline-sync-service');

interface SyncAction {
    entityType: 'REVIEW_LOG' | 'QUIZ_ATTEMPT';
    entityId?: string; // Optional for creates
    action: 'CREATE' | 'UPDATE';
    data: any;
    clientTimestamp: string;
}

export class OfflineSyncService {
    
    // Prefetch: Return next 3 days of content
    async prefetchContent(userId: string) {
        const today = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3);

        const [flashcards, dailyContent, quizzes] = await Promise.all([
            prisma.flashcard.findMany({
                where: {
                    topic: { userId },
                    nextReview: { lte: threeDaysLater }
                },
                take: 100
            }),
            prisma.dailyContent.findMany({
                where: {
                    userId,
                    date: { gte: today, lte: threeDaysLater }
                }
            }),
            // Fetch quizzes for recent active topics
            prisma.quiz.findMany({
                where: {
                    topicId: { in: await prisma.topic.findMany({ where: { userId }, select: { id: true } }).then(topics => topics.map(t => t.id)) },
                    // Simple heuristic: fetch recent quizz es
                },
                include: { questions: true },
                take: 5
            })
        ]);

        return {
            flashcards,
            dailyContent,
            quizzes,
            generatedAt: new Date()
        };
    }

    async syncWhenOnline(userId: string, changeset: SyncAction[]) {
        const results = {
            processed: 0,
            errors: 0,
            conflicts: 0
        };

        for (const change of changeset) {
            try {
                if (change.entityType === 'REVIEW_LOG' && change.action === 'CREATE') {
                    await prisma.reviewLog.create({
                        data: {
                            ...change.data,
                            userId,
                            reviewedAt: new Date(change.clientTimestamp) // Trust client time for spaced repetition accuracy
                        }
                    });
                } else if (change.entityType === 'QUIZ_ATTEMPT' && change.action === 'CREATE') {
                    // Logic to process quiz attempt (update mastery)
                    // ... (simplified for MVP)
                }

                // Log Sync
                await prisma.offlineSyncLog.create({
                    data: {
                        userId,
                        entityType: change.entityType,
                        entityId: change.entityId || 'new',
                        action: change.action,
                        clientTimestamp: new Date(change.clientTimestamp),
                        status: 'PROCESSED'
                    }
                });

                results.processed++;
            } catch (error) {
                logger.error('Sync error', error);
                results.errors++;
            }
        }

        return results;
    }
}
