import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { RedisClient } from '@shared/redis';
import axios from 'axios';
import { getConfig } from '@shared/config';

const logger = createLogger('viral-service');

interface BadgePayload {
    svg_base64: string;
    share_text: string;
    deep_link: string;
    preview_url: string;
}

interface LinkPayload {
    source_user: string;
    campaign: string;
    destination: string;
    params: Record<string, any>;
}

export class ViralService {
    private redis: RedisClient;
    private config = getConfig();

    constructor() {
        // Initialize Redis for caching badges/links
        const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
        this.redis = new RedisClient(redisUrl);
    }

    async generateStreakBadge(userId: string, template: string = 'minimal'): Promise<BadgePayload> {
        try {
            // 1. Fetch real-time achievements
            const userProgress = await prisma.userProgress.findUnique({ where: { userId } });
            const streak = userProgress?.streak || 0;
            // 1. Fetch User Stats from Learning Service
            const { services } = await import('@shared/index.ts');
            let rank = 1;
            let mastery = 0.85;
            
            try {
                const masteryData = await services.learning.get<{rank?: number, score?: number}>(`/learning/mastery/${userId}`);
                rank = masteryData.rank || 1;
                mastery = masteryData.score || 0.85;
            } catch (error) {
                logger.warn(`Failed to fetch mastery for user ${userId}, using defaults`, error);
            }
            
            // 2. Generate personalized visual
            // Using simple template for now, can be enhanced with dynamic SVG generation
            // In a real implementation, we'd use a library to draw this based on inputs
            const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="${this.selectGradient(streak)}"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" fill="white">
                    ${streak} Day Streak!
                </text>
            </svg>`;

            // 3. Create deep link with attribution
            const deepLink = await this.createAttributableLink({
                source_user: userId,
                campaign: `streak_${streak}`,
                destination: '/onboarding/streak_challenge',
                params: {
                    streak_target: streak + 7,
                    referral_bonus: 'double_xp_24h'
                }
            });

            // 4. Generate Share Text
            const shareText = await this.generateShareText(streak, mastery);

            // 5. Cache for 1 hour
            const cacheKey = `badge:${userId}:${streak}`;
            await this.redis.set(cacheKey, JSON.stringify({ svg, deepLink }), 3600);

            // Log the "intent" to share (not the actual platform share yet)
            // We only track the actual share when the client confirms it, but strictly for badge generation we can assume user intent
            
            return {
                svg_base64: Buffer.from(svg).toString('base64'),
                share_text: shareText,
                deep_link: deepLink,
                preview_url: `/api/v1/gamification/share/preview/${cacheKey}`
            };

        } catch (error) {
            logger.error('Error generating streak badge', error);
            throw error;
        }
    }

    private selectGradient(streak: number): string {
        if (streak > 30) return '#FF416C'; // Vivid Red
        if (streak > 7) return '#FFB75E'; // Orange
        return '#00C9FF'; // Blue
    }

    private async createAttributableLink(payload: LinkPayload): Promise<string> {
        // Simulate Branch.io / Dynamic Link generation
        // In prod: call Branch API
        const uniqueId = Math.random().toString(36).substring(7);
        const baseUrl = process.env.GAMIFICATION_SERVICE_URL || 'http://localhost:3004';
        return `${baseUrl}/deep-link/${uniqueId}?source=${payload.source_user}&campaign=${payload.campaign}`;
    }

    async generateShareText(streak: number, masteryScore: number): Promise<string> {
        // Call AI Service to generate text
        try {
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:3006';
            const prompt = `
            Generate 3 variations of share text for:
            - Streak: ${streak} days
            - Mastery: ${Math.round(masteryScore * 100)}%
            Tone: Humble-brag, encouraging, not arrogant. Include emojis.`;
            
            // 1. Call AI Service for caption generation
            const { services } = await import('@shared/index.ts');
            let caption = `I just hit a ${streak}-day streak on BrainX! 🚀 Can you beat me? #BrainX #Learning`;
            
            try {
                const aiResponse = await services.ai.post<{caption?: string}>('/api/v1/content/generate-caption', {
                    achievement: `a ${streak}-day streak and ${Math.round(masteryScore * 100)}% mastery`,
                    context: 'social_share',
                    prompt: prompt // Pass the detailed prompt to the AI service
                });
                caption = aiResponse.caption || caption;
            } catch (error) {
                logger.warn('AI service unavailable, using default caption', error);
            }
            
            return caption;
        } catch (error) {
           return `Check out my ${streak}-day streak on BrainX!`;
        }
    }

    async trackShareEvent(userId: string, platform: string, shareType: string, deepLink?: string) {
        return prisma.shareEvent.create({
            data: {
                sourceUser: userId,
                platform,
                shareType,
                deepLink
            }
        });
    }

    async handleDeepLinkInstall(sourceUser: string, newUser: string, campaign: string) {
       // 1. Grant Reward
       await prisma.referralReward.create({
           data: {
               userId: sourceUser,
               referralUser: newUser,
               rewardType: 'double_xp_24h'
           }
       });

       // 2. Publish Kafka Event (Mock)
       // kafka.publish('viral_conversion', ...)
       logger.info(`Viral conversion: ${sourceUser} referred ${newUser} via ${campaign}`);
    }
}
