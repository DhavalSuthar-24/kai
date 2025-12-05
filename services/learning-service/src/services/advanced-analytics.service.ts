import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('advanced-analytics-service');

interface VelocityMetrics {
    weeklyVelocity: number;
    trend: 'improving' | 'declining' | 'stable';
    optimalTime: string | null;
}

interface Anomaly {
    type: string;
    severity: number;
    date: Date;
    recommendation: string;
}

interface LearningDNA {
    memoryType: 'visual' | 'procedural' | 'semantic';
    optimalSessionLength: number;
    peakHour: number | null;
    forgettingRate: number; // e.g. 0.1 (low) to 0.9 (high)
}

export class AdvancedAnalyticsService {

    async getUserDashboard(userId: string) {
        const [velocity, anomalies, readinessDate, dna] = await Promise.all([
            this.calculateVelocity(userId),
            this.detectAnomalies(userId),
            this.predictReadinessDate(userId),
            this.generateLearningDNA(userId)
        ]);

        return {
            velocity,
            anomalies,
            readinessDate,
            dna
        };
    }

    // Topics mastered per study hour
    async calculateVelocity(userId: string): Promise<VelocityMetrics> {
        // 1. Get total study hours in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const sessions = await prisma.kaizenSession.findMany({
            where: {
                userId,
                startedAt: { gte: sevenDaysAgo },
                endedAt: { not: null }
            },
            select: { duration: true, startedAt: true }
        });

        const totalHours = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

        // 2. Get topics mastered in last 7 days (UserMastery updated with level >= 3)
        // Note: Prisma schema doesn't strictly track "when" a topic was mastered, but we can look at updatedAt if level >= 3
        const mastered = await prisma.userMastery.count({
            where: {
                userId,
                level: { gte: 3 },
                updatedAt: { gte: sevenDaysAgo }
            }
        });

        const weeklyVelocity = totalHours > 0 ? (mastered / totalHours) : 0;

        return {
            weeklyVelocity: parseFloat(weeklyVelocity.toFixed(2)),
            trend: 'stable', // Logic to compare vs previous week would be here
            optimalTime: this.findOptimalTime(sessions)
        };
    }

    private findOptimalTime(sessions: { startedAt: Date; duration: number | null }[]): string | null {
        if (sessions.length === 0) return null;
        // Simple mode: find hour with most sessions
        const hours: Record<number, number> = {};
        sessions.forEach(s => {
            const h = new Date(s.startedAt).getHours();
            hours[h] = (hours[h] || 0) + 1;
        });
        
        const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
        return peakHour ? `${peakHour[0]}:00` : null;
    }

    // Detect retention drops
    async detectAnomalies(userId: string): Promise<Anomaly[]> {
        // Mock Anomaly Logic: Check if average review quality yesterday was < 2.0
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);
        
        const endYesterday = new Date(yesterday);
        endYesterday.setHours(23,59,59,999);

        const reviews = await prisma.reviewLog.findMany({
            where: {
                userId,
                reviewedAt: { gte: yesterday, lte: endYesterday }
            },
            select: { quality: true }
        });

        const anomalies: Anomaly[] = [];

        if (reviews.length > 5) { // Minimum sample size
            const avgQuality = reviews.reduce((acc, r) => acc + r.quality, 0) / reviews.length;
            if (avgQuality < 2.5) {
                anomalies.push({
                    type: 'RETENTION_DROP',
                    severity: 0.8,
                    date: yesterday,
                    recommendation: 'Consider reviewing simpler cards or taking a break.'
                });
            }
        }

        return anomalies;
    }

    // Monte Carlo simulation mockup
    async predictReadinessDate(userId: string): Promise<Date | null> {
        // For MVP: Calculate user's "Topic Rate" and project forward to master all remaining topics.
        
        // 1. Count remaining topics
        // Need total topics count - mastered count
        // Simplified: Assume 50 topics total for demo if not found.
        const totalTopics = await prisma.topic.count({ where: { userId } });
        const mastered = await prisma.userMastery.count({ where: { userId, level: { gte: 3 } } });
        const remaining = totalTopics - mastered;

        if (remaining <= 0) return new Date(); // Ready!

        // 2. Rate: Topics per day
        // Assume 1 topic/day generic fallback if history is empty
        const rate = 1; 
        
        const daysNeeded = Math.ceil(remaining / rate);
        const readiness = new Date();
        readiness.setDate(readiness.getDate() + daysNeeded);
        
        return readiness;
    }

    // "Learning DNA" Report
    async generateLearningDNA(userId: string): Promise<LearningDNA> {
        // Heuristics:
        // Memory Type: 'semantic' (default) for now.
        // Optimal Session Length: Average of sessions with productivity score > 0.8? Or just average duration.
        
        const sessions = await prisma.kaizenSession.findMany({
            where: { userId, duration: { not: null } },
            take: 20,
            orderBy: { startedAt: 'desc' },
            select: { duration: true, startedAt: true }
        });

        const avgDuration = sessions.length > 0
            ? sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / sessions.length
            : 25; // Default Pomodoro

        const optimalTime = this.findOptimalTime(sessions);

        return {
            memoryType: 'semantic', 
            optimalSessionLength: Math.round(avgDuration),
            peakHour: optimalTime ? parseInt(optimalTime.split(':')[0] || '0') : null,
            forgettingRate: 0.3 // Default "medium" forgetting
        };
    }
}
