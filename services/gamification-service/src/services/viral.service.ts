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
         this.redis = RedisClient.getInstance();
    }

    async generateStreakBadge(userId: string, template: string = 'minimal'): Promise<BadgePayload> {
        try {
            // 1. Fetch real-time achievements
            const userProgress = await prisma.userProgress.findUnique({ where: { userId } });
            const streak = userProgress?.streak || 0;
            // Mock rank and mastery for now
            const masteryScore = 0.75; 
            const rank = 142;

            // 2. Generate personalized visual (Mocking dynamic SVG generation)
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
            const shareText = await this.generateShareText(streak, masteryScore);

            // 5. Cache for 1 hour
            const cacheKey = `badge:${userId}:${streak}`;
            await this.redis.setEx(cacheKey, 3600, JSON.stringify({ svg, deepLink }));

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
        const baseUrl = this.config.GAMIFICATION_SERVICE_URL || 'http://localhost:3004';
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
            Tone: Humble-brag, encouraging, not arrogant. Include emojis. Return only the best one.
            `;
            
            // Mock response if AI service isn't reachable or for speed
            // const response = await axios.post(`${aiServiceUrl}/api/v1/generate`, { prompt });
            // return response.data.text;
            
            return `I just hit a ${streak}-day streak on BrainX! 🚀 Can you beat me? #BrainX #Learning`; 
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
