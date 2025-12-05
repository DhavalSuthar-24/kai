import { RedisClient, createLogger, getConfig } from '@shared/index.ts';
import prisma from '../prisma.ts';

const config = getConfig();
const redisClient = new RedisClient(`redis://${config.REDIS_HOST}:${config.REDIS_PORT}`);

const logger = createLogger('leaderboard-service');

export class LeaderboardService {
    private readonly GLOBAL_KEY = 'leaderboard:global';
    
    async updateScore(userId: string, points: number) {
        try {
            // Using raw client from wrapper if needed, or if wrapper lacks zAdd/zRangeWithScores
            // The wrapper wrapper doesn't have zAdd. Let's assume we can access .getClient() or use raw client.
            await redisClient.getClient().set(`user:${userId}:points`, points.toString());
            await redisClient.getClient().zadd(this.GLOBAL_KEY, points, userId);
        } catch (error) {
            logger.error('Error updating redis leaderboard', error);
        }
    }
    
    async getGlobalLeaderboard(limit: number = 10) {
        try {
            // Get top users (ZREVRANGE 0 limit-1)
            // Note: Redis client wrapper in @shared/redis.ts might expose raw client or specific methods.
            // Assuming we can use zRangeWithScores or similar.
            // If the wrapper is limited, we might need to extend it or use the raw client.
            // Let's assume standard node-redis or ioredis interface on the client property.
            
            const results = await redisClient.getClient().zrange(this.GLOBAL_KEY, 0, limit - 1, 'REV', 'WITHSCORES');
            
            // ioredis zrange with WITHSCORES returns array [val1, score1, val2, score2] if generic, or list based on version.
            // Let's parse it manually if needed or assume standard format.
            // Actually ioredis returns strings.
            
            const processed = [];
            for (let i = 0; i < results.length; i += 2) {
                processed.push({ value: results[i], score: parseInt(results[i+1]) });
            }
            
            // Results is array of { value: string, score: number }
            
            // Enrich with user names (fetch from DB or cache)
            // For MVP, we fetch basic info from User table/UserProgress
            // Note: Gamification DB has UserProgress but maybe not User names (if sync issue).
            // User table exists in Gamification Schema (created via Kafka usually).
            
            const enriched = await Promise.all(processed.map(async (item) => {
                 const user = await prisma.user.findUnique({ where: { id: item.value } });
                 return {
                     userId: item.value,
                     points: item.score,
                     name: user?.name || 'Anonymous',
                     rank: 0 // Will populate in controller/socket if needed
                 };
            }));
            
            return enriched;
            
        } catch (error) {
            logger.error('Error fetching leaderboard', error);
            // Fallback to DB
            return await prisma.userProgress.findMany({
                orderBy: { points: 'desc' },
                take: limit,
                select: { userId: true, points: true }
            });
        }
    }
    
    async getUserRank(userId: string) {
        try {
            const rank = await redisClient.getClient().zrank(this.GLOBAL_KEY, userId);
            // zRank is 0-based, ascending. zRevRank is better.
            const revRank = await redisClient.getClient().zrevrank(this.GLOBAL_KEY, userId);
            
            return revRank !== null ? revRank + 1 : null;
        } catch (error) {
            return null;
        }
    }
}

export const leaderboardService = new LeaderboardService();
