import prisma from '../prisma.ts';
import { createLogger } from '@shared/logger';
import crypto from 'crypto';

const logger = createLogger('result-verification-service');

export interface ShareableResult {
  shareId: string;
  shareUrl: string;
  imageUrl?: string;
  verificationHash: string;
  expiresAt: Date;
}

export interface VerifiedResult {
  testId: string;
  score: number;
  percentile: number;
  globalRank: number | null;
  topicId: string;
  submittedAt: Date;
  verified: boolean;
  user: {
    anonId: string;
    name?: string;
  };
}

export class ResultVerificationService {
  /**
   * Generate a shareable result with verification
   */
  async generateShareableResult(
    resultId: string,
    userId: string
  ): Promise<ShareableResult> {
    try {
      // 1. Fetch the result
      const result = await prisma.mockTestResult.findUnique({
        where: { id: resultId },
        include: { test: true }
      });

      if (!result) {
        throw new Error('Result not found');
      }

      if (result.userId !== userId) {
        throw new Error('Unauthorized');
      }

      // 2. Generate share ID (short, URL-safe)
      const shareId = this.generateShareId();

      // 3. Generate verification hash
      const verificationHash = this.generateVerificationHash({
        resultId,
        userId,
        score: result.score,
        percentile: result.percentile,
        topicId: result.topicId
      });

      // 4. Store share record (expires in 30 days)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Create a share record in database (you may want to add a ShareResult model)
      // For now, we'll use metadata field in MockTestResult
      await prisma.mockTestResult.update({
        where: { id: resultId },
        data: {
          metadata: JSON.stringify({
            ...JSON.parse(result.metadata || '{}'),
            shareId,
            verificationHash,
            shareExpiresAt: expiresAt.toISOString()
          })
        }
      });

      // 5. Generate share URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/share/test/${shareId}`;

      // 6. Generate image URL (for social sharing)
      const imageUrl = await this.generateResultImage(result);

      logger.info(`Shareable result created: ${shareId} for result ${resultId}`);

      return {
        shareId,
        shareUrl,
        imageUrl,
        verificationHash,
        expiresAt
      };
    } catch (error) {
      logger.error('Error generating shareable result:', error);
      throw error;
    }
  }

  /**
   * Verify and retrieve a shared result
   */
  async verifySharedResult(shareId: string): Promise<VerifiedResult | null> {
    try {
      // Find result by shareId in metadata
      const results = await prisma.mockTestResult.findMany({
        include: { test: true }
      });

      const result = results.find(r => {
        try {
          const metadata = JSON.parse(r.metadata || '{}');
          return metadata.shareId === shareId;
        } catch {
          return false;
        }
      });

      if (!result) {
        logger.warn(`Share not found: ${shareId}`);
        return null;
      }

      const metadata = JSON.parse(result.metadata || '{}');

      // Check expiration
      if (metadata.shareExpiresAt && new Date(metadata.shareExpiresAt) < new Date()) {
        logger.warn(`Share expired: ${shareId}`);
        return null;
      }

      // Verify hash
      const expectedHash = this.generateVerificationHash({
        resultId: result.id,
        userId: result.userId,
        score: result.score,
        percentile: result.percentile,
        topicId: result.topicId
      });

      const verified = metadata.verificationHash === expectedHash;

      // Get anonymized user info
      const anonId = this.generateAnonId(result.userId);

      return {
        testId: result.testId,
        score: result.score,
        percentile: result.percentile,
        globalRank: result.globalRank,
        topicId: result.topicId,
        submittedAt: result.submittedAt,
        verified,
        user: {
          anonId,
          name: `User ${anonId.substring(0, 6)}`
        }
      };
    } catch (error) {
      logger.error('Error verifying shared result:', error);
      return null;
    }
  }

  /**
   * Generate a short, URL-safe share ID
   */
  private generateShareId(): string {
    return crypto.randomBytes(8).toString('base64url');
  }

  /**
   * Generate verification hash to prevent tampering
   */
  private generateVerificationHash(data: any): string {
    const secret = process.env.SHARE_SECRET || 'default-secret-change-in-production';
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Generate anonymized ID for user
   */
  private generateAnonId(userId: string): string {
    const secret = process.env.ANON_SECRET || 'anon-secret';
    return crypto.createHmac('sha256', secret).update(userId).digest('hex').substring(0, 12);
  }

  /**
   * Generate result image for social sharing
   * This would typically use a service like Puppeteer or an image generation API
   */
  private async generateResultImage(result: any): Promise<string | undefined> {
    // Placeholder - in production, you'd generate an actual image
    // using Puppeteer, Canvas, or an image generation service
    const baseUrl = process.env.CDN_URL || 'http://localhost:3000';
    return `${baseUrl}/api/og/test-result?score=${result.score}&percentile=${result.percentile}`;
  }

  /**
   * Get sharing stats for a result
   */
  async getSharingStats(resultId: string, userId: string): Promise<{
    shareCount: number;
    viewCount: number;
    lastShared?: Date;
  }> {
    const result = await prisma.mockTestResult.findUnique({
      where: { id: resultId }
    });

    if (!result || result.userId !== userId) {
      throw new Error('Result not found or unauthorized');
    }

    const metadata = JSON.parse(result.metadata || '{}');

    return {
      shareCount: metadata.shareCount || 0,
      viewCount: metadata.viewCount || 0,
      lastShared: metadata.lastShared ? new Date(metadata.lastShared) : undefined
    };
  }

  /**
   * Track a share view
   */
  async trackShareView(shareId: string): Promise<void> {
    try {
      const results = await prisma.mockTestResult.findMany();
      const result = results.find(r => {
        try {
          const metadata = JSON.parse(r.metadata || '{}');
          return metadata.shareId === shareId;
        } catch {
          return false;
        }
      });

      if (result) {
        const metadata = JSON.parse(result.metadata || '{}');
        metadata.viewCount = (metadata.viewCount || 0) + 1;

        await prisma.mockTestResult.update({
          where: { id: result.id },
          data: { metadata: JSON.stringify(metadata) }
        });
      }
    } catch (error) {
      logger.error('Error tracking share view:', error);
    }
  }
}

export const resultVerificationService = new ResultVerificationService();
