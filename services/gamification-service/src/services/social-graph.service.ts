import { prisma } from '../prisma.ts';
import { RedisClient } from '@shared/redis';
import { KafkaClient } from '@shared/kafka';
import { createLogger } from '@shared/logger';

const logger = createLogger('social-graph-service');
const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
const kafka = new KafkaClient('gamification-service', [process.env.KAFKA_BROKERS || 'localhost:9092']);

export class SocialGraphService {
  async followUser(followerId: string, targetId: string, topics: string[] = []): Promise<void> {
    // 1. Check not blocked
    const isBlocked = await this.isBlocked(followerId, targetId);
    if (isBlocked) {
      throw new Error('Cannot follow blocked user');
    }

    // 2. Create follow relationship
    await prisma.socialGraph.upsert({
      where: { followerId_targetId: { followerId, targetId } },
      create: { followerId, targetId, topics },
      update: { topics },
    });

    // 3. Update Redis sets
    await redis.getClient().sadd(`followers:${targetId}`, followerId);
    await redis.getClient().sadd(`following:${followerId}`, targetId);

    // 4. Check if notification allowed
    const settings = await this.getPrivacySettings(targetId);
    
    if (settings.allowFollowerNotif) {
      // 5. Publish Kafka event for notification
      await kafka.send('gamification-events', [
        {
          type: 'USER_FOLLOWED',
          data: { followerId, targetId, topics },
        },
      ]);
    }

    logger.info(`User ${followerId} followed ${targetId}`);
  }

  async unfollowUser(followerId: string, targetId: string): Promise<void> {
    await prisma.socialGraph.deleteMany({
      where: { followerId, targetId },
    });

    await redis.getClient().srem(`followers:${targetId}`, followerId);
    await redis.getClient().srem(`following:${followerId}`, targetId);

    logger.info(`User ${followerId} unfollowed ${targetId}`);
  }

  async getFollowers(userId: string, limit = 50): Promise<string[]> {
    const cacheKey = `followers:${userId}`;
    const cached = await redis.getClient().smembers(cacheKey);

    if (cached.length > 0) {
      return cached.slice(0, limit);
    }

    const followers = await prisma.socialGraph.findMany({
      where: { targetId: userId },
      select: { followerId: true },
      take: limit,
    });

    const followerIds = followers.map((f) => f.followerId);

    // Cache in Redis
    for (const id of followerIds) {
      await redis.getClient().sadd(cacheKey, id);
    }

    return followerIds;
  }

  async getFollowing(userId: string, limit = 50): Promise<string[]> {
    const cacheKey = `following:${userId}`;
    const cached = await redis.getClient().smembers(cacheKey);

    if (cached.length > 0) {
      return cached.slice(0, limit);
    }

    const following = await prisma.socialGraph.findMany({
      where: { followerId: userId },
      select: { targetId: true },
      take: limit,
    });

    const followingIds = following.map((f) => f.targetId);

    for (const id of followingIds) {
      await redis.getClient().sadd(cacheKey, id);
    }

    return followingIds;
  }

  async blockUser(userId: string, blockedId: string): Promise<void> {
    // 1. Add to block list
    await prisma.blockList.upsert({
      where: { userId_blockedId: { userId, blockedId } },
      create: { userId, blockedId },
      update: {},
    });

    // 2. Remove all follow relationships
    await prisma.socialGraph.deleteMany({
      where: {
        OR: [
          { followerId: userId, targetId: blockedId },
          { followerId: blockedId, targetId: userId },
        ],
      },
    });

    // 3. Update Redis
    await redis.getClient().sadd(`blocked:${userId}`, blockedId);
    await redis.getClient().srem(`followers:${userId}`, blockedId);
    await redis.getClient().srem(`following:${userId}`, blockedId);
    await redis.getClient().srem(`followers:${blockedId}`, userId);
    await redis.getClient().srem(`following:${blockedId}`, userId);

    logger.info(`User ${userId} blocked ${blockedId}`);
  }

  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const [blockedByMe, blockedByThem] = await Promise.all([
      redis.getClient().sismember(`blocked:${userId}`, otherUserId),
      redis.getClient().sismember(`blocked:${otherUserId}`, userId),
    ]);

    return blockedByMe === 1 || blockedByThem === 1;
  }

  async getPrivacySettings(userId: string): Promise<any> {
    let settings = await prisma.privacySettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.privacySettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async canViewContent(viewerId: string, creatorId: string, contentType: string): Promise<boolean> {
    if (viewerId === creatorId) return true;

    const settings = await this.getPrivacySettings(creatorId);
    const isBlocked = await this.isBlocked(viewerId, creatorId);

    if (isBlocked) return false;

    const  visibility = settings[`show${contentType}` as keyof typeof settings] as string;

    switch (visibility) {
      case 'PUBLIC':
        return true;
      case 'FOLLOWERS':
        const isFollower = await redis.getClient().sismember(`followers:${creatorId}`, viewerId);
        return isFollower === 1;
      case 'NOBODY':
        return false;
      default:
        return false;
    }
  }
}
