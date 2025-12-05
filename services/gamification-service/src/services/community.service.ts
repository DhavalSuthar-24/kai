import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { createHash } from 'crypto';
import { getConfig } from '@shared/config';

const logger = createLogger('community-service');

export class CommunityService {
    private config = getConfig();

    // Deterministic but irreversible anonymous ID
    private generateAnonymousId(userId: string): string {
        const secret = process.env.ANON_SECRET || 'default-secret-change-me';
        return createHash('sha256')
            .update(userId + secret)
            .digest('hex')
            .substring(0, 16);
    }

    async postQuestion(userId: string, topicId: string, questionText: string) {
        const anonId = this.generateAnonymousId(userId);

        // 1. Check duplicates (Simple text match for MVP, ideally Vector Search)
        // In MVP, we skip sophisticated vector search for simplicity unless content-service mock search is exposed nicely.
        
        // 2. Generate AI Draft (Mock)
        const aiDraft = "Here is a quick AI-generated summary of the answer..."; 

        // 3. Store
        const question = await prisma.question.create({
            data: {
                anonId,
                topicId,
                question: questionText,
                aiDraft
            }
        });

        // 4. Notify Experts (Mock logic)
        // kafka.publish('question_posted', { topic_id: topicId, id: question.id });

        return question;
    }

    async submitAnswer(userId: string, questionId: string, answerText: string) {
        // 1. Verify Mastery (Mock > 0.6 check)
        // const mastery = await prisma.userMastery.findFirst(...)
        const masteryScore = 0.8; // Assume expert
        if (masteryScore < 0.6) {
            throw new Error('Insufficient mastery to answer');
        }

        const anonId = this.generateAnonymousId(userId);

        // 2. AI Quality Check (Mock)
        const quality = 0.85; 

        // 3. Store Answer
        const answer = await prisma.answer.create({
            data: {
                questionId,
                anonId,
                answer: answerText,
                quality
            }
        });

        // 4. Update Reputation
        await this.updateReputation(anonId, 10, quality);

        return answer;
    }

    private async updateReputation(anonId: string, points: number, quality: number) {
        const rep = await prisma.anonReputation.findUnique({ where: { anonId } });
        
        if (!rep) {
            await prisma.anonReputation.create({
                data: {
                    anonId,
                    reputation: points,
                    answersGiven: 1,
                    avgQuality: quality
                }
            });
        } else {
            const newCount = rep.answersGiven + 1;
            const newAvg = ((rep.avgQuality * rep.answersGiven) + quality) / newCount;
            await prisma.anonReputation.update({
                where: { anonId },
                data: {
                    reputation: rep.reputation + points,
                    answersGiven: newCount,
                    avgQuality: newAvg
                }
            });
        }
    }

    async getFeed(userId: string, topicId?: string) {
        // Personalized feed: Get recent questions for topics user is interested in
        // If topicId provided, filter by that.
        
        const where = topicId ? { topicId } : {};

        return prisma.question.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                answers: {
                    orderBy: { quality: 'desc' },
                    take: 1
                }
            }
        });
    }
}
