
// Notification types
export enum NotificationType {
  STREAK_REMINDER = 'STREAK_REMINDER',
  KAIZEN_REMINDER = 'KAIZEN_REMINDER',
  FLASHCARD_DUE = 'FLASHCARD_DUE',
  DOOMSCROLL_INTERVENTION = 'DOOMSCROLL_INTERVENTION',
  MEMORY_OF_DAY = 'MEMORY_OF_DAY',
  FRIEND_CHALLENGE = 'FRIEND_CHALLENGE',
  LEADERBOARD_UPDATE = 'LEADERBOARD_UPDATE',
  WEEKLY_INSIGHTS = 'WEEKLY_INSIGHTS',
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  STREAK_WARNING = 'STREAK_WARNING',
  LEVEL_UP = 'LEVEL_UP',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  FOCUS_SESSION_COMPLETE = 'FOCUS_SESSION_COMPLETE',
  CHALLENGE_INVITE = 'CHALLENGE_INVITE',
  VERIFICATION_EMAIL = 'VERIFICATION_EMAIL',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SYSTEM = 'SYSTEM',
}

// Notification channels
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

// Notification status
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

// Queue status
export enum QueueStatus {
  PENDING = 'PENDING',
  RETRYING = 'RETRYING',
  FAILED = 'FAILED',
  SUCCEEDED = 'SUCCEEDED',
}

// Device platforms
export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

// Notification data interfaces
export interface NotificationData {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  templateId?: string;
  variables?: Record<string, any>;
}

export interface EmailNotificationData extends NotificationData {
  to: string;
  subject: string;
  body: string;
  unsubscribeUrl?: string;
}

export interface PushNotificationData extends NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionButtons?: Array<{
    title: string;
    action: string;
  }>;
}

// Template variable types
export interface TemplateVariables {
  userName?: string;
  flashcardCount?: number;
  streak?: number;
  appName?: string;
  friendName?: string;
  memoryTitle?: string;
  weeklyStats?: {
    flashcardsReviewed: number;
    topicsCompleted: number;
    focusMinutes: number;
    streak: number;
  };
  [key: string]: any;
}

// Rate limit configuration
export interface RateLimitConfig {
  emailPerHour: number;
  pushPerHour: number;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  retryIntervals: number[]; // in minutes
}
