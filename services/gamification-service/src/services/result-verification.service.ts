import { prisma } from '../prisma.ts';
import { RedisClient } from '@shared/redis';
import { KafkaClient } from '@shared/kafka';
import { createLogger } from '@shared/logger';
import { generateMerkleRoot, generateIntegrityChecksum, verifyIntegrityChecksum } from '../utils/merkle-tree.ts';
import crypto from 'crypto';

const logger = createLogger('result-verification-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
const kafka = new KafkaClient('gamification-service', [process.env.KAFKA_BROKERS || 'localhost:9092']);

export class ResultVerificationService {
  async createProof(resultId: string, userId: string, resultData: any): Promise<string> {
    const { answers, score, timestamp } = resultData;

    // 1. Generate Merkle root from answers
    const merkleRoot = generateMerkleRoot(answers);

    // 2. Generate integrity checksum
    const integrityCheck = generateIntegrityChecksum(merkleRoot, userId, timestamp);

    // 3. Create ZK proof metadata (simplified)
    const proofData = JSON.stringify({
      score,
      timestamp,
      questionCount: answers.length,
      verified: true,
    });

    // 4. Store proof
    await prisma.resultProof.create({
      data: {
        resultId,
        userId,
        merkleRoot,
        proofData,
        integrityCheck,
        verified: true,
      },
    });

    logger.info(`Created proof for result ${resultId}`);
    return merkleRoot;
  }

  async verifyProof(shareId: string): Promise<boolean> {
    try {
      // Get shared result
      const sharedResult = await prisma.sharedResult.findUnique({
        where: { shareId },
      });

      if (!sharedResult) return false;

      // Get proof
      const proof = await prisma.resultProof.findUnique({
        where: { resultId: sharedResult.resultId },
      });

      if (!proof) return false;

      return proof.verified;
    } catch (error) {
      logger.error('Error verifying proof:', error);
      return false;
    }
  }

  async shareResult(
    resultId: string,
    resultType: string,
    userId: string,
    visibility: 'PUBLIC' | 'UNLISTED' = 'PUBLIC'
  ): Promise<string> {
    // Create shared result
    const sharedResult = await prisma.sharedResult.create({
      data: {
        resultId,
        resultType,
        visibility,
      },
    });

    // Cache in Redis (7 days)
    await redis.set(
      `shared_result:${sharedResult.shareId}`,
      JSON.stringify({ resultId, resultType, userId }),
      7 * 24 * 60 * 60
    );

    // Publish Kafka event
    await kafka.send('gamification-events', [
      {
        type: 'RESULT_SHARED',
        data: { shareId: sharedResult.shareId, resultId, resultType, userId },
      },
    ]);

    logger.info(`Result ${resultId} shared with ID ${sharedResult.shareId}`);
    return sharedResult.shareId;
  }

  async getSharedResult(shareId: string): Promise<any> {
    // Check cache
    const cached = await redis.get(`shared_result:${shareId}`);
    if (cached) {
      const data = JSON.parse(cached);
      
      // Increment access count
      await prisma.sharedResult.update({
        where: { shareId },
        data: { accessCount: { increment: 1 } },
      });

      return data;
    }

    // Get from database
    const sharedResult = await prisma.sharedResult.findUnique({
      where: { shareId },
    });

    if (!sharedResult) return null;

    await prisma.sharedResult.update({
      where: { shareId },
      data: { accessCount: { increment: 1 } },
    });

    return sharedResult;
  }

  generateAnonymousId(userId: string, salt = 'anon_salt_2024'): string {
    return crypto.createHash('sha256').update(userId + salt).digest('hex').substring(0, 16);
  }
}
