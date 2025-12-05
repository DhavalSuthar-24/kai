import { prisma } from '../prisma.ts';
import { RedisClient } from '@shared/redis';
import { createLogger } from '@shared/logger';

const logger = createLogger('trueskill-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

interface Rating {
  mu: number;
  sigma: number;
}

interface ChallengeScore {
  score: number;
  accuracy: number;
  speed: number;
}

export class TrueSkillService {
  // Default TrueSkill parameters
  private readonly INITIAL_MU = 25.0;
  private readonly INITIAL_SIGMA = 8.333;
  private readonly BETA = this.INITIAL_SIGMA / 2; // Performance variance
  private readonly TAU = this.INITIAL_SIGMA / 100; // Dynamics factor
  private readonly DRAW_PROBABILITY = 0.0; // No draws in challenges

  /**
   * Get user's TrueSkill rating for a specific topic
   */
  async getRating(userId: string, topicId: string): Promise<Rating> {
    try {
      const rating = await prisma.challengeRating.findUnique({
        where: { userId_topicId: { userId, topicId } },
      });

      if (!rating) {
        // Return default rating for new users
        return { mu: this.INITIAL_MU, sigma: this.INITIAL_SIGMA };
      }

      return { mu: rating.mu, sigma: rating.sigma };
    } catch (error) {
      logger.error('Error getting rating:', error);
      return { mu: this.INITIAL_MU, sigma: this.INITIAL_SIGMA };
    }
  }

  /**
   * Find a fair opponent within ±3 sigma of challenger's rating
   */
  async findFairOpponent(challengerId: string, topicId: string): Promise<string | null> {
    try {
      const myRating = await this.getRating(challengerId, topicId);

      // Get online users from Redis (last 5 minutes)
      const onlineUsers = await redis.getClient().smembers('online_users');

      if (onlineUsers.length === 0) {
        return null;
      }

      // Find users with ratings within acceptable range
      const fairOpponents: Array<{ userId: string; rating: Rating; distance: number }> = [];

      for (const userId of onlineUsers) {
        if (userId === challengerId) continue;

        const rating = await this.getRating(userId, topicId);
        const distance = Math.abs(rating.mu - myRating.mu);
        const maxDistance = 3 * (rating.sigma + myRating.sigma);

        if (distance <= maxDistance) {
          fairOpponents.push({ userId, rating, distance });
        }
      }

      if (fairOpponents.length === 0) {
        return null;
      }

      // Sort by closest rating and return the best match
      fairOpponents.sort((a, b) => a.distance - b.distance);
      return fairOpponents[0].userId;
    } catch (error) {
      logger.error('Error finding opponent:', error);
      return null;
    }
  }

  /**
   * Calculate challenge score: 70% accuracy + 30% speed
   */
  calculateScore(answers: any[], timeLimit: number): ChallengeScore {
    const correctCount = answers.filter((a) => a.correct).length;
    const accuracy = correctCount / answers.length;

    const avgTime = answers.reduce((sum, a) => sum + a.timeSeconds, 0) / answers.length;
    const speed = Math.max(0, 1 - avgTime / timeLimit);

    const score = accuracy * 0.7 + speed * 0.3;

    return { score, accuracy, speed };
  }

  /**
   * Update TrueSkill ratings after a challenge
   * Implements simplified TrueSkill algorithm
   */
  async updateRatings(
    winnerId: string,
    loserId: string,
    topicId: string,
    winnerScore: number,
    loserScore: number
  ): Promise<{ winnerDelta: number; loserDelta: number; quality: number }> {
    try {
      const winnerRating = await this.getRating(winnerId, topicId);
      const loserRating = await this.getRating(loserId, topicId);

      // Calculate match quality (0.0 to 1.0, higher = more balanced)
      const quality = this.calculateMatchQuality(winnerRating, loserRating);

      // Performance difference
      const performanceDiff = winnerScore - loserScore;

      // Update winner rating
      const winnerMuNew = this.updateMu(
        winnerRating.mu,
        winnerRating.sigma,
        loserRating.mu,
        loserRating.sigma,
        1, // winner = 1
        performanceDiff
      );

      const winnerSigmaNew = this.updateSigma(winnerRating.sigma, loserRating.sigma);

      // Update loser rating
      const loserMuNew = this.updateMu(
        loserRating.mu,
        loserRating.sigma,
        winnerRating.mu,
        winnerRating.sigma,
        0, // loser = 0
        -performanceDiff
      );

      const loserSigmaNew = this.updateSigma(loserRating.sigma, winnerRating.sigma);

      // Store updated ratings in database
      await Promise.all([
        this.upsertRating(winnerId, topicId, winnerMuNew, winnerSigmaNew),
        this.upsertRating(loserId, topicId, loserMuNew, loserSigmaNew),
      ]);

      return {
        winnerDelta: winnerMuNew - winnerRating.mu,
        loserDelta: loserRating.mu - loserMuNew,
        quality,
      };
    } catch (error) {
      logger.error('Error updating ratings:', error);
      throw error;
    }
  }

  /**
   * Calculate match quality (Balanced = 1.0, Mismatch = 0.0)
   */
  private calculateMatchQuality(r1: Rating, r2: Rating): number {
    const totalSigma = Math.sqrt(r1.sigma ** 2 + r2.sigma ** 2 + 2 * this.BETA ** 2);
    const muDiff = Math.abs(r1.mu - r2.mu);
    const quality = Math.exp(-(muDiff ** 2) / (2 * totalSigma ** 2));
    return quality;
  }

  /**
   * Update mu (skill) rating
   */
  private updateMu(
    mu: number,
    sigma: number,
    oppMu: number,
    oppSigma: number,
    result: number,
    performanceDiff: number
  ): number {
    const c = Math.sqrt(sigma ** 2 + oppSigma ** 2 + 2 * this.BETA ** 2);
    const expectedScore = this.cdf((mu - oppMu) / c);
    const v = this.v((mu - oppMu) / c);
    const muNew = mu + (sigma ** 2 / c) * v * (result - expectedScore) * (1 + performanceDiff);

    return muNew;
  }

  /**
   * Update sigma (uncertainty)
   */
  private updateSigma(sigma: number, oppSigma: number): number {
    const c = Math.sqrt(sigma ** 2 + oppSigma ** 2 + 2 * this.BETA ** 2);
    const w = this.w((sigma ** 2 + oppSigma ** 2) / c ** 2);
    const sigmaNew = Math.sqrt(sigma ** 2 * (1 - (sigma ** 2 / c ** 2) * w));

    return Math.max(sigmaNew, this.INITIAL_SIGMA / 4); // Minimum uncertainty
  }

  /**
   * Cumulative distribution function
   */
  private cdf(x: number): number {
    return (1.0 + this.erf(x / Math.sqrt(2.0))) / 2.0;
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * V function for TrueSkill
   */
  private v(t: number): number {
    const pdf = Math.exp(-(t ** 2) / 2) / Math.sqrt(2 * Math.PI);
    const cdf = this.cdf(t);
    return pdf / cdf;
  }

  /**
   * W function for TrueSkill
   */
  private w(epsilon: number): number {
    return epsilon;
  }

  /**
   * Upsert rating in database
   */
  private async upsertRating(
    userId: string,
    topicId: string,
    mu: number,
    sigma: number
  ): Promise<void> {
    await prisma.challengeRating.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, mu, sigma, games: 1 },
      update: { mu, sigma, games: { increment: 1 } },
    });
  }

  /**
   * Get leaderboard for a topic
   */
  async getLeaderboard(topicId: string, limit = 10): Promise<any[]> {
    try {
      const ratings = await prisma.challengeRating.findMany({
        where: { topicId },
        orderBy: { mu: 'desc' },
        take: limit,
      });

      return ratings.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        rating: Math.round(r.mu - 3 * r.sigma), // Conservative skill estimate
        mu: r.mu,
        sigma: r.sigma,
        games: r.games,
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return [];
    }
  }
}
