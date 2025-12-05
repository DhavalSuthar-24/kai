import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('analytics-service');

export class AnalyticsService {
    
    async getOverview(userId: string) {
        // Total Study Time (from Kaizen Sessions)
        const sessions = await prisma.kaizenSession.aggregate({
            where: { userId },
            _sum: { duration: true }
        });
        const totalMinutes = sessions._sum.duration || 0;
        
        // Topics Mastered (Mastery Level >= 3?)
        // Assuming level 3 is mastered
        const masteredTopics = await prisma.userMastery.count({
            where: { 
                userId,
                level: { gte: 3 }
            }
        });
        
        // Streak (from UserProgress or calc)
        // UserProgress currently in Gamification Service DB.
        // Option 1: Call Gamification Service.
        // Option 2: Calc from DailyContent/Sessions local.
        // Let's use local KaizenSession/ReviewLog to estimate streak if can't call Gamification.
        // But better: Just return null and let frontend fetch streak from Gamification.
        // Or fetch via HTTP if strictly needed.
        // Prompt says "Aggregates from topic, flashcards, daily activity". 
        // I will focus on Learning Service local data.
        
        return {
            totalStudyHours: Math.floor(totalMinutes / 60),
            totalStudyMinutes: totalMinutes,
            topicsMastered: masteredTopics,
            activeStreak: null // Frontend fetches from Gamification
        };
    }

    async getFlashcardStats(userId: string) {
        const total = await prisma.flashcard.count({
            where: { topic: { userId } } // Flashcards belong to topics created by user
        });
        
        const reviewedToday = await prisma.reviewLog.count({
            where: {
                userId,
                reviewedAt: {
                    gte: new Date(new Date().setHours(0,0,0,0))
                }
            }
        });
        
        // Due count
        const due = await prisma.flashcard.count({
            where: {
                topic: { userId },
                nextReview: { lte: new Date() }
            }
        });

        return {
            totalCards: total,
            reviewedToday,
            dueCount: due
        };
    }

    async getTopicProgress(userId: string) {
        // Breakdown by module or subject
        // For MVP, return progress of all topics
        const progress = await prisma.userMastery.findMany({
            where: { userId },
            include: { subtopic: true }
        });
        
        return progress.map(p => ({
            subtopicId: p.subtopicId,
            name: p.subtopic.name,
            level: p.level,
            confidence: p.confidence
        }));
    }

    async getStudyTime(userId: string, range: string = '7d') {
         // Aggregate KaizenSession duration by day
         const days = range === '30d' ? 30 : 7;
         const startDate = new Date();
         startDate.setDate(startDate.getDate() - days);
         
         // Raw query or group by
         // SQLite/Postgres date truncation differs.
         // Prisma groupBy is easier if we just list sessions.
         
         const sessions = await prisma.kaizenSession.findMany({
             where: {
                 userId,
                 startedAt: { gte: startDate }
             },
             select: {
                 startedAt: true,
                 duration: true
             }
         });
         
         // Aggregate in JS
         const map = new Map<string, number>();
         sessions.forEach(s => {
             const date = s.startedAt.toISOString().split('T')[0];
             if (date) {
                 map.set(date, (map.get(date) || 0) + (s.duration || 0));
             }
         });
         
         return Array.from(map.entries()).map(([date, minutes]) => ({ date, minutes }));
    }

    async getReviewAccuracy(userId: string) {
        // Last 100 reviews?
        const logs = await prisma.reviewLog.findMany({
            where: { userId },
            orderBy: { reviewedAt: 'desc' },
            take: 100,
            select: { quality: true }
        });
        
        if (logs.length === 0) return 0;
        
        // Quality >= 3 is success
        const successes = logs.filter(l => l.quality >= 3).length;
        return (successes / logs.length) * 100;
    }
}
