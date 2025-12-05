import prisma from '../prisma.ts';
import { RedisClient } from '@shared/redis';
import { KafkaClient } from '@shared/kafka';
import { createLogger } from '@shared/logger';
import {
  calculateIRTScore,
  calculatePercentile,
  generateAnonId,
  generateIntegrityHash,
  verifyIntegrityHash,
  assignIRTDifficulty,
  type IRTQuestion,
  type IRTAnswer,
} from '../utils/irt-scoring.ts';

const logger = createLogger('mock-test-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
const kafka = new KafkaClient('learning-service', [process.env.KAFKA_BROKERS || 'localhost:9092']);

export interface TestParams {
  topicId: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionCount: number;
  timeLimit: number; // minutes
}

export interface TestSession {
  sessionId: string;
  questions: any[];
  timeLimit: number;
  expiresAt: Date;
}

export interface AntiCheatMetadata {
  tabSwitches: number;
  screenshotAttempts: number;
  mouseViolations: number;
  flags: string[];
}

export class MockTestService {
  /**
   * Generate a new mock test
   */
  async generateTest(userId: string, params: TestParams): Promise<TestSession> {
    try {
      // 1. Generate questions via AI service
      const questions = await this.fetchQuestionsFromAI(params);

      // 2. Assign IRT difficulty to questions
      const irtQuestions: IRTQuestion[] = questions.map((q: any) => ({
        id: q.id,
        difficulty: assignIRTDifficulty(q.bloomsLevel || 'understand', q.complexity || 5),
        correctAnswer: q.correctAnswer,
      }));

      // 3. Generate integrity hash
      const integrityHash = generateIntegrityHash(irtQuestions);

      // 4. Create test record
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
      const test = await prisma.mockTest.create({
        data: {
          userId,
          topicId: params.topicId,
          difficulty: params.difficulty,
          questionCount: params.questionCount,
          timeLimit: params.timeLimit,
          questions: JSON.stringify(irtQuestions),
          integrityHash,
          expiresAt,
        },
      });

      // 5. Store in Redis for real-time access
      await redis.set(
        `test:${test.id}`,
        JSON.stringify({
          userId,
          questions: irtQuestions,
          startTime: Date.now(),
          status: 'ACTIVE',
          integrity: integrityHash,
        }),
        10800 // 3 hours TTL
      );

      // 6. Initialize anti-cheat monitoring
      await redis.set(
        `test_monitor:${test.id}`,
        JSON.stringify({
          tabSwitches: 0,
          screenshotAttempts: 0,
          mouseViolations: 0,
          flags: [],
          mouseEvents: [],
        }),
        10800
      );

      logger.info(`Mock test created: ${test.id} for user ${userId}`);

      return {
        sessionId: test.id,
        questions: irtQuestions.map((q) => ({
          id: q.id,
          // Don't send correctAnswer to client
          difficulty: q.difficulty,
        })),
        timeLimit: params.timeLimit,
        expiresAt: test.expiresAt,
      };
    } catch (error) {
      logger.error('Error generating test:', error);
      throw error;
    }
  }

  /**
   * Record anti-cheat violation
   */
  async recordViolation(
    sessionId: string,
    violationType: string,
    metadata?: any
  ): Promise<void> {
    try {
      const key = `test_monitor:${sessionId}`;
      const data = await redis.get(key);

      if (!data) {
        logger.warn(`No monitoring data for session ${sessionId}`);
        return;
      }

      const monitorData: AntiCheatMetadata = JSON.parse(data);

      switch (violationType) {
        case 'TAB_SWITCH':
          monitorData.tabSwitches++;
          break;
        case 'SCREENSHOT':
          monitorData.screenshotAttempts++;
          break;
        case 'MOUSE_BOT':
          monitorData.mouseViolations++;
          break;
        default:
          monitorData.flags.push(violationType);
      }

      // Flag as suspicious if too many violations
      if (
        monitorData.tabSwitches > 3 ||
        monitorData.screenshotAttempts > 0 ||
        monitorData.mouseViolations > 2
      ) {
        monitorData.flags.push('SUSPICIOUS_ACTIVITY');
      }

      await redis.set(key, JSON.stringify(monitorData), 10800);
    } catch (error) {
      logger.error('Error recording violation:', error);
    }
  }

  /**
   * Submit test and calculate results
   */
  async submitTest(
    sessionId: string,
    userId: string,
    answers: IRTAnswer[]
  ): Promise<any> {
    try {
      // 1. Verify test exists and is active
      const test = await prisma.mockTest.findUnique({ where: { id: sessionId } });

      if (!test) {
        throw new Error('Test not found');
      }

      if (test.status !== 'ACTIVE') {
        throw new Error('Test already submitted or expired');
      }

      if (test.userId !== userId) {
        throw new Error('Unauthorized');
      }

      // 2. Check if expired (allow 10min grace period)
      if (new Date() > new Date(test.expiresAt.getTime() + 10 * 60 * 1000)) {
        await prisma.mockTest.update({
          where: { id: sessionId },
          data: { status: 'INVALID' },
        });
        throw new Error('Test expired');
      }

      // 3. Verify integrity
      const questions: IRTQuestion[] = JSON.parse(test.questions);
      const isValid = verifyIntegrityHash(questions, test.integrityHash);

      if (!isValid) {
        await prisma.mockTest.update({
          where: { id: sessionId },
          data: { status: 'INVALID' },
        });
        throw new Error('Test integrity compromised');
      }

      // 4. Calculate IRT score
      const score = calculateIRTScore(answers, questions);

      // 5. Get all scores for this topic to calculate percentile
      const allResults = await prisma.mockTestResult.findMany({
        where: { topicId: test.topicId },
        select: { score: true },
      });

      const percentile = calculatePercentile(
        score,
        allResults.map((r) => r.score)
      );

      // 6. Get anti-cheat data
      const monitorData = await redis.get(`test_monitor:${sessionId}`);
      const metadata: AntiCheatMetadata = monitorData
        ? JSON.parse(monitorData)
        : { tabSwitches: 0, screenshotAttempts: 0, mouseViolations: 0, flags: [] };

      // Calculate integrity score (1.0 = clean, lower = suspicious)
      let integrityScore = 1.0;
      integrityScore -= metadata.tabSwitches * 0.1;
      integrityScore -= metadata.screenshotAttempts * 0.3;
      integrityScore -= metadata.mouseViolations * 0.15;
      integrityScore = Math.max(0, Math.min(1, integrityScore));

      // 7. Store result
      const result = await prisma.mockTestResult.create({
        data: {
          testId: sessionId,
          userId,
          topicId: test.topicId,
          score,
          percentile,
          integrityScore,
          answers: JSON.stringify(answers),
          metadata: JSON.stringify(metadata),
        },
      });

      // 8. Update test status
      await prisma.mockTest.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' },
      });

      // 9. Calculate global rank
      const betterScores = await prisma.mockTestResult.count({
        where: {
          topicId: test.topicId,
          score: { gt: score },
        },
      });

      const globalRank = betterScores + 1;

      await prisma.mockTestResult.update({
        where: { id: result.id },
        data: { globalRank },
      });

      // 10. Update leaderboard (anonymized)
      await this.updateLeaderboard(userId, test.topicId, score, percentile, globalRank);

      // 11. Publish Kafka event
      await kafka.send('learning-events', [
        {
          type: 'MOCK_TEST_COMPLETED',
          data: {
            userId,
            topicId: test.topicId,
            score,
            percentile,
            globalRank,
            integrityScore,
          },
        },
      ]);

      // 12. Cleanup Redis
      await redis.del(`test:${sessionId}`);
      await redis.del(`test_monitor:${sessionId}`);

      logger.info(`Mock test submitted: ${sessionId}, score: ${score}, percentile: ${percentile}`);

      return {
        testId: sessionId,
        score,
        percentile,
        globalRank,
        integrityScore,
        suspicious: integrityScore < 0.8,
      };
    } catch (error) {
      logger.error('Error submitting test:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a topic
   */
  async getLeaderboard(topicId: string, userId: string, limit = 10): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `leaderboard:${topicId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        const leaderboard = JSON.parse(cached);
        const myPosition = await this.getMyPosition(userId, topicId);
        return { top: leaderboard, myPosition };
      }

      // Fetch from database
      const top = await prisma.mockTestLeaderboard.findMany({
        where: { topicId },
        orderBy: { rank: 'asc' },
        take: limit,
      });

      // Cache for 5 minutes
      await redis.set(cacheKey, JSON.stringify(top), 300);

      const myPosition = await this.getMyPosition(userId, topicId);

      return { top, myPosition };
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return { top: [], myPosition: null };
    }
  }

  /**
   * Get user's position in leaderboard
   */
  private async getMyPosition(userId: string, topicId: string): Promise<any> {
    const myResult = await prisma.mockTestResult.findFirst({
      where: { userId, topicId },
      orderBy: { score: 'desc' },
    });

    if (!myResult) return null;

    return {
      rank: myResult.globalRank,
      score: myResult.score,
      percentile: myResult.percentile,
    };
  }

  /**
   * Update leaderboard (anonymized)
   */
  private async updateLeaderboard(
    userId: string,
    topicId: string,
    score: number,
    percentile: number,
    rank: number
  ): Promise<void> {
    const anonId = generateAnonId(userId);

    // Check if user already on leaderboard
    const existing = await prisma.mockTestLeaderboard.findFirst({
      where: { topicId, anonId },
    });

    if (existing && existing.score < score) {
      // Update with better score
      await prisma.mockTestLeaderboard.update({
        where: { id: existing.id },
        data: { score, percentile, rank },
      });
    } else if (!existing) {
      // Add new entry
      await prisma.mockTestLeaderboard.create({
        data: { topicId, anonId, score, percentile, rank },
      });
    }

    // Invalidate cache
    await redis.del(`leaderboard:${topicId}`);
  }

  /**
   * Fetch questions from AI service
   */
  private async fetchQuestionsFromAI(params: TestParams): Promise<any[]> {
    try {
      const response = await fetch(
        `${process.env.AI_SERVICE_URL || 'http://localhost:3006'}/api/v1/curriculum/generate-quiz`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: params.topicId,
            questionCount: params.questionCount,
            difficulty: params.difficulty,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const data = await response.json() as { questions?: any[] };
      return data.questions || [];
    } catch (error) {
      logger.error('Error fetching questions from AI:', error);
      // Fallback: return mock questions
      return Array.from({ length: params.questionCount }, (_, i) => ({
        id: `q${i + 1}`,
        question: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        bloomsLevel: 'understand',
        complexity: 5,
      }));
    }
  }
}
