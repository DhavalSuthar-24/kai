import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import {  asyncHandler } from '@shared/middleware';
import { prisma } from '../prisma.ts';
import { RedisClient } from '@shared/redis';
import { KafkaClient } from '@shared/kafka';
import { createLogger } from '@shared/logger';
import { TrueSkillService } from '../services/trueskill.service.ts';
import { z } from 'zod';

const logger = createLogger('challenge-controller');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
const kafka = new KafkaClient('gamification-service', [process.env.KAFKA_BROKERS || 'localhost:9092']);
const trueSkillService = new TrueSkillService();

// Validation schemas
const createChallengeSchema = z.object({
  topicId: z.string().uuid(),
  questionCount: z.number().min(3).max(20).default(5),
  timeLimit: z.number().min(30).max(600).default(60), // seconds
});

const submitAnswerSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.string(),
      correct: z.boolean(),
      timeSeconds: z.number(),
    })
  ),
});

export class ChallengeController {
  /**
   * POST /challenges/create
   * Create a new challenge and find an opponent
   */
  static createChallenge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const validated = createChallengeSchema.parse(req.body);

    // 1. Check rate limit (10 challenges/day)
    const today = new Date().toISOString().split('T')[0];
    const rateKey = `rate_limit:challenge:${userId}:${today}`;
    const count = await redis.getClient().incr(rateKey);

    if (count === 1) {
      await redis.getClient().expire(rateKey, 86400); // 24 hours
    }

    if (count > 10) {
      return res.status(429).json({
        success: false,
        message: 'Daily challenge limit reached (10/day). Try again tomorrow.',
      });
    }

    // 2. Validate user mastery (>60% on topic) - Mock for now
    const mastery = await ChallengeController.getUserMastery(userId, validated.topicId);
    if (mastery < 0.6) {
      return res.status(400).json({
        success: false,
        message: `You need at least 60% mastery in this topic to challenge others. Current: ${(mastery * 100).toFixed(0)}%`,
      });
    }

    // 3. Find fair opponent
    const opponentId = await trueSkillService.findFairOpponent(userId, validated.topicId);

    if (!opponentId) {
      return res.status(404).json({
        success: false,
        message: 'No suitable opponents online. Try again later!',
      });
    }

    // 4. Generate challenge content
    const content = await ChallengeController.generateChallengeContent(
      validated.topicId,
      validated.questionCount
    );

    // 5. Create challenge match
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const match = await prisma.challengeMatch.create({
      data: {
        challengerId: userId,
        opponentId,
        topicId: validated.topicId,
        questionCount: validated.questionCount,
        timeLimit: validated.timeLimit,
        content: JSON.stringify(content),
        expiresAt,
      },
    });

    // 6. Get ratings
    const [challengerRating, opponentRating] = await Promise.all([
      trueSkillService.getRating(userId, validated.topicId),
      trueSkillService.getRating(opponentId, validated.topicId),
    ]);

    // 7. Store in Redis
    await redis.set(
      `challenge:${match.id}`,
      JSON.stringify({
        id: match.id,
        status: 'PENDING',
        participants: [userId, opponentId],
        content,
        ratings: {
          [userId]: challengerRating,
          [opponentId]: opponentRating,
        },
        expiresAt: match.expiresAt.toISOString(),
      }),
      7200
    );

    // 8. Publish event
    await kafka.send('gamification-events', [
      {
        type: 'CHALLENGE_CREATED',
        data: {
          matchId: match.id,
          challengerId: userId,
          opponentId,
          topicId: validated.topicId,
          expiresAt: match.expiresAt,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        matchId: match.id,
        opponent: opponentId,
        status: 'PENDING',
        expiresAt: match.expiresAt,
      },
      message: 'Challenge created! Waiting for opponent to accept.',
    });
  });

  static acceptChallenge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { id: matchId } = req.params;

    const match = await prisma.challengeMatch.findUnique({ where: { id: matchId } });

    if (!match) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (match.opponentId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (match.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Challenge already started' });
    }

    const updated = await prisma.challengeMatch.update({
      where: { id: matchId },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });

    const redisData = await redis.get(`challenge:${matchId}`);
    if (redisData) {
      const data = JSON.parse(redisData);
      data.status = 'ACTIVE';
      await redis.set(`challenge:${matchId}`, JSON.stringify(data), 7200);
    }

    res.json({
      success: true,
      data: {
        matchId: updated.id,
        status: 'ACTIVE',
        content: JSON.parse(updated.content),
        timeLimit: updated.timeLimit,
      },
      message: 'Challenge accepted! Good luck!',
    });
  });

  static submitChallenge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { id: matchId } = req.params;
    const validated = submitAnswerSchema.parse(req.body);

    const match = await prisma.challengeMatch.findUnique({
      where: { id: matchId },
      include: { results: true },
    });

    if (!match) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (match.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Challenge not active' });
    }

    const scoreData = trueSkillService.calculateScore(validated.answers, match.timeLimit);

    await prisma.challengeResult.create({
      data: {
        matchId,
        userId,
        score: scoreData.score,
        answers: JSON.stringify(validated.answers),
      },
    });

    const results = await prisma.challengeResult.findMany({ where: { matchId } });

    if (results.length === 2) {
      const finalResult = await ChallengeController.finalizeChallenge(match.id, results);
      return res.json({
        success: true,
        data: finalResult,
        message: 'Challenge completed!',
      });
    }

    res.json({
      success: true,
      data: { status: 'WAITING', yourScore: scoreData.score },
      message: 'Waiting for opponent...',
    });
  });

  static getChallengeHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;

    const matches = await prisma.challengeMatch.findMany({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
        status: 'COMPLETED',
      },
      include: { results: true },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    const history = matches.map((m) => ({
      matchId: m.id,
      topicId: m.topicId,
      opponent: m.challengerId === userId ? m.opponentId : m.challengerId,
      myScore: m.results.find((r) => r.userId === userId)?.score || 0,
      opponentScore: m.results.find((r) => r.userId !== userId)?.score || 0,
      won: (m.results.find((r) => r.userId === userId)?.score || 0) >
           (m.results.find((r) => r.userId !== userId)?.score || 0),
      completedAt: m.completedAt,
    }));

    res.json({ success: true, data: history });
  });

  static getLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { topicId } = req.params;
    const userId = req.user?.id!;

    const leaderboard = await trueSkillService.getLeaderboard(topicId, 10);

    const allRatings = await prisma.challengeRating.findMany({
      where: { topicId },
      orderBy: { mu: 'desc' },
    });

    const myRank = allRatings.findIndex((r) => r.userId === userId) + 1;
    const myRating = allRatings.find((r) => r.userId === userId);

    res.json({
      success: true,
      data: {
        top: leaderboard,
        myPosition: {
          rank: myRank || null,
          rating: myRating ? Math.round(myRating.mu - 3 * myRating.sigma) : null,
          games: myRating?.games || 0,
        },
      },
    });
  });

  private static async finalizeChallenge(matchId: string, results: any[]) {
    const [result1, result2] = results;
    const winnerId = result1.score > result2.score ? result1.userId : result2.userId;
    const loserId = result1.score > result2.score ? result2.userId : result1.userId;
    const match = await prisma.challengeMatch.findUnique({ where: { id: matchId } });

    if (!match) throw new Error('Match not found');

    const ratingChange = await trueSkillService.updateRatings(
      winnerId,
      loserId,
      match.topicId,
      result1.score > result2.score ? result1.score : result2.score,
      result1.score > result2.score ? result2.score : result1.score
    );

    await prisma.challengeMatch.update({
      where: { id: matchId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await kafka.send('gamification-events', [
      {
        type: 'CHALLENGE_COMPLETED',
        data: { matchId, winnerId, loserId, ratingChange },
      },
    ]);

    await redis.del(`challenge:${matchId}`);

    return { winner: winnerId, loser: loserId, ratingChange };
  }

  private static async getUserMastery(_userId: string, _topicId: string): Promise<number> {
    return 0.75; // Mock
  }

  private static async generateChallengeContent(topicId: string, questionCount: number) {
    try {
      const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:3006'}/api/v1/curriculum/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, questionCount, difficulty: 'MEDIUM' }),
      });

      if (!response.ok) throw new Error('AI service error');
      const data = await response.json();
      return data.questions;
    } catch (error) {
      logger.error('Error generating content:', error);
      return Array.from({ length: questionCount }, (_, i) => ({
        id: `q${i + 1}`,
        question: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      }));
    }
  }
}

// Export named functions for routes
export const createChallenge = ChallengeController.createChallenge;
export const joinChallenge = ChallengeController.acceptChallenge;
export const getChallenges = ChallengeController.getChallengeHistory;
export const getMyChallenges = ChallengeController.getChallengeHistory;

