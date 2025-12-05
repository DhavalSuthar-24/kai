import prisma from '../prisma.ts';
import { RedisClient } from '@shared/redis';
import { KafkaClient } from '@shared/kafka';
import { createLogger } from '@shared/logger';

const logger = createLogger('feed-engine-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
const kafka = new KafkaClient('learning-service', [process.env.KAFKA_BROKERS || 'localhost:9092']);

interface ScoredFeedItem {
  item: any;
  score: number;
}

interface FeedPreferences {
  showChallenges: boolean;
  showMockTests: boolean;
  showAchievements: boolean;
  showTips: boolean;
}

export class FeedEngineService {
  /**
   * Get interest-based feed for user
   * Personalized based on user's topics
   */
  async getInterestFeed(userId: string, limit = 20, cursor?: string): Promise<any[]> {
    try {
      // 1. Check cache
      const cacheKey = `feed_queue:${userId}`;
      const cached = await redis.get(cacheKey);

      if (cached && !cursor) {
        const items = JSON.parse(cached);
        return items.slice(0, limit);
      }

      // 2. Get user's topics (interests)
      const userTopics = await this.getUserTopics(userId);

      if (userTopics.length === 0) {
        // Cold start: return general feed
        return this.getGeneralFeed(userId, limit);
      }

      // 3. Get candidates from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const candidates = await prisma.feedItem.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          creatorId: { not: userId }, // Don't show own items
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // 4. Score each candidate
      const scored: ScoredFeedItem[] = [];

      for (const item of candidates) {
        const score = await this.calculateInterestScore(item, userId, userTopics);
        scored.push({ item, score });
      }

      // 5. Sort by score
      scored.sort((a, b) => b.score - a.score);

      // 6. Inject exploration items (20%)
      const explorationCount = Math.floor(limit * 0.2);
      const mainFeed = scored.slice(0, limit - explorationCount);
      const explorationItems = await this.getExplorationItems(userId, userTopics, explorationCount);

      const combined = [...mainFeed.map((s) => s.item), ...explorationItems];

      // 7. Filter out seen items
      const unseenItems = await this.filterSeenItems(userId, combined);

      // 8. Deduplicate
      const deduplicated = this.deduplicateItems(unseenItems);

      // 9. Cache for 5 minutes
      await redis.set(cacheKey, JSON.stringify(deduplicated), 300);

      return deduplicated.slice(0, limit);
    } catch (error) {
      logger.error('Error getting interest feed:', error);
      return [];
    }
  }

  /**
   * Get general feed (trending items for all users)
   */
  async getGeneralFeed(userId: string, limit = 20, cursor?: string): Promise<any[]> {
    try {
      // 1. Get trending items
      const trending = await this.getTrendingItems(limit * 2);

      // 2. Diversify by creator (max 2 per creator)
      const diversified = this.diversifyByCreator(trending, 2);

      // 3. Filter seen items
      const unseenItems = await this.filterSeenItems(userId, diversified);

      // 4. Return top items
      return unseenItems.slice(0, limit);
    } catch (error) {
      logger.error('Error getting general feed:', error);
      return [];
    }
  }

  /**
   * Calculate multi-objective ranking score
   * 5 signals: topicRelevance (30%), quality (25%), recency (20%), social (15%), serendipity (10%)
   */
  private async calculateInterestScore(
    item: any,
    userId: string,
    userTopics: string[]
  ): Promise<number> {
    const itemTopics: string[] = item.topics || [];

    // 1. Topic Relevance (30%)
    const relevance = this.getTopicRelevance(itemTopics, userTopics);

    // 2. Content Quality (25%) - based on impressions
    const quality = await this.getContentQuality(item.id);

    // 3. Recency (20%) - time decay
    const recency = this.getRecencyScore(item.createdAt);

    // 4. Social Proof (15%) - engagement
    const social = await this.getSocialProof(item.id);

    // 5. Serendipity (10%) - novelty bonus
    const serendipity = this.getSerendipityScore(itemTopics, userTopics);

    const totalScore =
      relevance * 0.3 +
      quality * 0.25 +
      recency * 0.2 +
      social * 0.15 +
      serendipity * 0.1;

    return totalScore;
  }

  /**
   * Get topic relevance score (Jaccard similarity)
   */
  private getTopicRelevance(itemTopics: string[], userTopics: string[]): number {
    if (itemTopics.length === 0 || userTopics.length === 0) return 0;

    const intersection = itemTopics.filter((t) => userTopics.includes(t)).length;
    const union = new Set([...itemTopics, ...userTopics]).size;

    return intersection / union;
  }

  /**
   * Get content quality score based on impressions
   */
  private async getContentQuality(itemId: string): Promise<number> {
    const impressions = await prisma.feedImpression.count({
      where: { itemId },
    });

    const clicks = await prisma.feedImpression.count({
      where: { itemId, action: 'CLICKED' },
    });

    if (impressions === 0) return 0.5; // Default for new items

    const ctr = clicks / impressions;
    return Math.min(1, ctr * 2); // Scale CTR to 0-1
  }

  /**
   * Get recency score with exponential decay
   */
  private getRecencyScore(createdAt: Date): number {
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const halfLife = 24; // 24 hours
    return Math.exp(-ageHours / halfLife);
  }

  /**
   * Get social proof score
   */
  private async getSocialProof(itemId: string): Promise<number> {
    const views = await prisma.feedImpression.count({
      where: { itemId, action: 'VIEWED' },
    });

    // Normalize to 0-1 using log scale
    return Math.min(1, Math.log10(views + 1) / 3);
  }

  /**
   * Get serendipity score (bonus for novel topics)
   */
  private getSerendipityScore(itemTopics: string[], userTopics: string[]): number {
    const novelTopics = itemTopics.filter((t) => !userTopics.includes(t)).length;
    return Math.min(1, novelTopics / Math.max(itemTopics.length, 1));
  }

  /**
   * Get exploration items (popular but outside user's topics)
   */
  private async getExplorationItems(
    userId: string,
    userTopics: string[],
    count: number
  ): Promise<any[]> {
    const trending = await this.getTrendingItems(count * 2);

    // Filter for items with topics NOT in user's interests
    const exploration = trending.filter((item) => {
      const itemTopics: string[] = item.topics || [];
      return itemTopics.some((t) => !userTopics.includes(t));
    });

    return exploration.slice(0, count);
  }

  /**
   * Get trending items from Redis sorted set
   */
  private async getTrendingItems(limit: number): Promise<any[]> {
    try {
      const key = 'trending_items:7d';
      const trendingIds = await redis.getClient().zrevrange(key, 0, limit - 1);

      if (trendingIds.length === 0) {
        // Fallback: get recent items
        return prisma.feedItem.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
      }

      // Fetch items
      return prisma.feedItem.findMany({
        where: { id: { in: trendingIds } },
      });
    } catch (error) {
      logger.error('Error getting trending items:', error);
      return prisma.feedItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }
  }

  /**
   * Diversify feed by limiting items per creator
   */
  private diversifyByCreator(items: any[], maxPerCreator: number): any[] {
    const creatorCounts: Record<string, number> = {};
    const diversified: any[] = [];

    for (const item of items) {
      const count = creatorCounts[item.creatorId] || 0;

      if (count < maxPerCreator) {
        diversified.push(item);
        creatorCounts[item.creatorId] = count + 1;
      }
    }

    return diversified;
  }

  /**
   * Filter out items user has already seen
   */
  private async filterSeenItems(userId: string, items: any[]): Promise<any[]> {
    const seenKey = `seen_items:${userId}`;
    const seenIds = await redis.getClient().smembers(seenKey);

    return items.filter((item) => !seenIds.includes(item.id));
  }

  /**
   * Deduplicate items
   */
  private deduplicateItems(items: any[]): any[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Mark items as seen
   */
  async markAsSeen(userId: string, itemIds: string[]): Promise<void> {
    const seenKey = `seen_items:${userId}`;

    for (const id of itemIds) {
      await redis.getClient().sadd(seenKey, id);
    }

    // Set 30-day expiry
    await redis.getClient().expire(seenKey, 30 * 24 * 60 * 60);
  }

  /**
   * Record feed impression
   */
  async recordImpression(userId: string, itemId: string, action: string): Promise<void> {
    try {
      await prisma.feedImpression.create({
        data: { userId, itemId, action },
      });

      // Update trending score
      if (action === 'CLICKED') {
        await this.updateTrendingScore(itemId, 2);
      } else if (action === 'VIEWED') {
        await this.updateTrendingScore(itemId, 1);
      }
    } catch (error) {
      logger.error('Error recording impression:', error);
    }
  }

  /**
   * Update trending score in Redis
   */
  private async updateTrendingScore(itemId: string, points: number): Promise<void> {
    const key = 'trending_items:7d';
    await redis.getClient().zincrby(key, points, itemId);
    await redis.getClient().expire(key, 7 * 24 * 60 * 60);
  }

  /**
   * Publish item to feeds (fan-out to followers)
   */
  async publishToFeeds(item: any): Promise<void> {
    try {
      // This would fan out to followers' feeds
      // For simplicity, just publish Kafka event
      await kafka.send('learning-events', [
        {
          type: 'FEED_ITEM_PUBLISHED',
          data: {
            itemId: item.id,
            creatorId: item.creatorId,
            itemType: item.itemType,
            topics: item.topics,
          },
        },
      ]);

      logger.info(`Published feed item: ${item.id}`);
    } catch (error) {
      logger.error('Error publishing to feeds:', error);
    }
  }

  /**
   * Get user's topics (interests)
   */
  private async getUserTopics(userId: string): Promise<string[]> {
    try {
      // Check cache
      const cacheKey = `user_topics:${userId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database (topics user has studied)
      const topics = await prisma.topic.findMany({
        where: { userId },
        select: { id: true },
        take: 20,
      });

      const topicIds = topics.map((t) => t.id);

      // Cache for 1 hour
      await redis.set(cacheKey, JSON.stringify(topicIds), 3600);

      return topicIds;
    } catch (error) {
      logger.error('Error getting user topics:', error);
      return [];
    }
  }
}
