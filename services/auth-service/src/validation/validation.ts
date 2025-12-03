import { z } from 'zod';

export const userPreferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  doomscrollAlerts: z.boolean().optional(),
  focusModeDefault: z.string().uuid().optional().nullable(),
  theme: z.enum(['LIGHT', 'DARK', 'AUTO']).optional(),
  language: z.string().min(2).max(5).optional(),
});

export const userGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetValue: z.number().int().positive(),
  unit: z.enum(['MINUTES', 'HOURS', 'SESSIONS', 'CAPTURES']),
  category: z.enum(['FOCUS', 'LEARNING', 'PRODUCTIVITY', 'WELLNESS']),
  deadline: z.string().datetime().optional(),
});

export const focusModeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration: z.number().int().positive(),
  blockedApps: z.array(z.string()),
  allowedApps: z.array(z.string()),
});
