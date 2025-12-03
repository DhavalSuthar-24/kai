import { createLogger } from '@shared/index.ts';
import { NotificationType, NotificationChannel } from '../types/notifications.ts';
import Redis from 'ioredis';

const logger = createLogger('preference-checker');

interface UserPreferences {
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  kaizenReminders: boolean;
  doomscrollAlerts: boolean;
  memoryOfDay: boolean;
  friendChallenges: boolean;
  weeklyInsights: boolean;
}

export interface PreferenceCheckResult {
  allowed: boolean;
  reason?: string;
}

export class PreferenceChecker {
  private redis: Redis;
  private authServiceUrl: string;

  constructor(redis: Redis, authServiceUrl: string = 'http://localhost:3001') {
    this.redis = redis;
    this.authServiceUrl = authServiceUrl;
  }

  /**
   * Check if user allows this notification type and channel
   */
  async checkPreference(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<PreferenceCheckResult> {
    try {
      const preferences = await this.getUserPreferences(userId);

      // Check global notification toggle
      if (!preferences.notificationsEnabled) {
        return {
          allowed: false,
          reason: 'User has disabled all notifications',
        };
      }

      // Check channel-specific toggle
      if (channel === NotificationChannel.EMAIL && !preferences.emailNotifications) {
        return {
          allowed: false,
          reason: 'User has disabled email notifications',
        };
      }

      if (channel === NotificationChannel.PUSH && !preferences.pushNotifications) {
        return {
          allowed: false,
          reason: 'User has disabled push notifications',
        };
      }

      // Check notification type-specific preference
      const typeAllowed = this.checkTypePreference(type, preferences);
      if (!typeAllowed.allowed) {
        return typeAllowed;
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Failed to check preferences', error);
      // Fail open - allow notification if preference check fails
      return { allowed: true };
    }
  }

  /**
   * Check type-specific preference
   */
  private checkTypePreference(
    type: NotificationType,
    preferences: UserPreferences
  ): PreferenceCheckResult {
    const typeMapping: Record<NotificationType, keyof UserPreferences | null> = {
      [NotificationType.KAIZEN_REMINDER]: 'kaizenReminders',
      [NotificationType.FLASHCARD_DUE]: 'kaizenReminders', // Same as kaizen reminders
      [NotificationType.DOOMSCROLL_INTERVENTION]: 'doomscrollAlerts',
      [NotificationType.MEMORY_OF_DAY]: 'memoryOfDay',
      [NotificationType.FRIEND_CHALLENGE]: 'friendChallenges',
      [NotificationType.WEEKLY_INSIGHTS]: 'weeklyInsights',
      [NotificationType.WELCOME_EMAIL]: null, // Always allowed
      [NotificationType.STREAK_WARNING]: 'kaizenReminders', // Same as kaizen reminders
      [NotificationType.LEVEL_UP]: 'friendChallenges', // Group under friend/gamification
      [NotificationType.ACHIEVEMENT_UNLOCKED]: 'friendChallenges', // Group under friend/gamification
      [NotificationType.CHALLENGE_INVITE]: 'friendChallenges',
    };

    const preferenceKey = typeMapping[type];

    // If no specific preference, allow it
    if (!preferenceKey) {
      return { allowed: true };
    }

    if (!preferences[preferenceKey]) {
      return {
        allowed: false,
        reason: `User has disabled ${type} notifications`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get user preferences from cache or auth service
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `preferences:${userId}`;

    try {
      // Try to get from cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from auth service
      const response = await fetch(`${this.authServiceUrl}/preferences/${userId}`);
      
      if (!response.ok) {
        logger.warn(`Failed to fetch preferences for user ${userId}, using defaults`);
        return this.getDefaultPreferences();
      }

      const data = await response.json();
      const preferences = data as UserPreferences;

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(preferences));

      return preferences;
    } catch (error) {
      logger.error('Failed to get user preferences', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get default preferences (all enabled)
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      notificationsEnabled: true,
      emailNotifications: true,
      pushNotifications: true,
      kaizenReminders: true,
      doomscrollAlerts: true,
      memoryOfDay: true,
      friendChallenges: true,
      weeklyInsights: true,
    };
  }

  /**
   * Invalidate cached preferences for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `preferences:${userId}`;
    await this.redis.del(cacheKey);
    logger.info(`Invalidated preference cache for user ${userId}`);
  }
}
