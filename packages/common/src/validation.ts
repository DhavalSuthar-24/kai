import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters');

// Auth validation schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(255).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Content validation schemas
export const contentTypeSchema = z.enum(['SCREENSHOT', 'TEXT', 'VIDEO']);

export const createCaptureSchema = z.object({
  userId: uuidSchema,
  type: contentTypeSchema,
  content: z.string().min(1, 'Content is required'),
  source: z.string().max(255).optional(),
  metadata: z.string().optional(),
});

// Learning validation schemas
export const createTopicSchema = z.object({
  name: z.string().min(1).max(255),
  userId: uuidSchema,
  parentId: uuidSchema.optional(),
});

export const createFlashcardSchema = z.object({
  topicId: uuidSchema,
  front: z.string().min(1),
  back: z.string().min(1),
});

export const reviewFlashcardSchema = z.object({
  flashcardId: uuidSchema,
  quality: z.number().int().min(0).max(5),
});

export const completeTopicSchema = z.object({
  topicId: uuidSchema,
  userId: uuidSchema,
});

// Helper type extraction
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export type ReviewFlashcardInput = z.infer<typeof reviewFlashcardSchema>;
export type CompleteTopicInput = z.infer<typeof completeTopicSchema>;
