import { createLogger } from './logger.ts';

const logger = createLogger('error-handler');

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  // Retryable errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Non-retryable errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  
  // Fatal errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Categorized error class
 */
export class CategorizedError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public statusCode?: number,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'CategorizedError';
    
    // Maintain stack trace
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
  
  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return [
      ErrorCategory.NETWORK_ERROR,
      ErrorCategory.TIMEOUT_ERROR,
      ErrorCategory.RATE_LIMIT_ERROR,
      ErrorCategory.SERVICE_UNAVAILABLE
    ].includes(this.category);
  }
  
  /**
   * Check if error is fatal
   */
  isFatal(): boolean {
    return [
      ErrorCategory.DATABASE_ERROR,
      ErrorCategory.INTERNAL_ERROR
    ].includes(this.category);
  }
  
  /**
   * Check if error is user-facing
   */
  isUserError(): boolean {
    return [
      ErrorCategory.VALIDATION_ERROR,
      ErrorCategory.AUTHENTICATION_ERROR,
      ErrorCategory.AUTHORIZATION_ERROR,
      ErrorCategory.NOT_FOUND_ERROR,
      ErrorCategory.CONFLICT_ERROR
    ].includes(this.category);
  }
  
  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK_ERROR]: 'Unable to connect to the service. Please try again.',
      [ErrorCategory.TIMEOUT_ERROR]: 'The request took too long. Please try again.',
      [ErrorCategory.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment and try again.',
      [ErrorCategory.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
      [ErrorCategory.VALIDATION_ERROR]: this.message,
      [ErrorCategory.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
      [ErrorCategory.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
      [ErrorCategory.NOT_FOUND_ERROR]: 'The requested resource was not found.',
      [ErrorCategory.CONFLICT_ERROR]: 'This action conflicts with existing data.',
      [ErrorCategory.DATABASE_ERROR]: 'A database error occurred. Please contact support.',
      [ErrorCategory.INTERNAL_ERROR]: 'An internal error occurred. Please contact support.',
      [ErrorCategory.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
    };
    
    return messages[this.category] || this.message;
  }
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: any): CategorizedError {
  // Already categorized
  if (error instanceof CategorizedError) {
    return error;
  }
  
  const message = error.message || 'Unknown error';
  let category = ErrorCategory.UNKNOWN_ERROR;
  let statusCode = error.statusCode || error.status || 500;
  
  // HTTP status code based categorization
  if (statusCode) {
    if (statusCode === 400) category = ErrorCategory.VALIDATION_ERROR;
    else if (statusCode === 401) category = ErrorCategory.AUTHENTICATION_ERROR;
    else if (statusCode === 403) category = ErrorCategory.AUTHORIZATION_ERROR;
    else if (statusCode === 404) category = ErrorCategory.NOT_FOUND_ERROR;
    else if (statusCode === 409) category = ErrorCategory.CONFLICT_ERROR;
    else if (statusCode === 429) category = ErrorCategory.RATE_LIMIT_ERROR;
    else if (statusCode === 503) category = ErrorCategory.SERVICE_UNAVAILABLE;
    else if (statusCode >= 500) category = ErrorCategory.INTERNAL_ERROR;
  }
  
  // Error code based categorization
  if (error.code) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      category = ErrorCategory.NETWORK_ERROR;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      category = ErrorCategory.TIMEOUT_ERROR;
    } else if (error.code === 'P2002' || error.code === 'P2003') {
      // Prisma unique constraint / foreign key violation
      category = ErrorCategory.CONFLICT_ERROR;
    } else if (error.code?.startsWith('P')) {
      // Other Prisma errors
      category = ErrorCategory.DATABASE_ERROR;
    }
  }
  
  // Error name based categorization
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    category = ErrorCategory.VALIDATION_ERROR;
  } else if (error.name === 'UnauthorizedError') {
    category = ErrorCategory.AUTHENTICATION_ERROR;
  } else if (error.name === 'ForbiddenError') {
    category = ErrorCategory.AUTHORIZATION_ERROR;
  } else if (error.name === 'NotFoundError') {
    category = ErrorCategory.NOT_FOUND_ERROR;
  }
  
  return new CategorizedError(message, category, statusCode, error);
}

/**
 * Handle error with appropriate logging and response
 */
export function handleError(error: any, context?: Record<string, any>): CategorizedError {
  const categorized = categorizeError(error);
  
  // Add context
  if (context) {
    categorized.context = { ...categorized.context, ...context };
  }
  
  // Log based on severity
  if (categorized.isFatal()) {
    logger.error('Fatal error occurred', {
      category: categorized.category,
      message: categorized.message,
      stack: categorized.stack,
      context: categorized.context
    });
  } else if (categorized.isRetryable()) {
    logger.warn('Retryable error occurred', {
      category: categorized.category,
      message: categorized.message,
      context: categorized.context
    });
  } else if (categorized.isUserError()) {
    logger.info('User error occurred', {
      category: categorized.category,
      message: categorized.message,
      context: categorized.context
    });
  } else {
    logger.error('Error occurred', {
      category: categorized.category,
      message: categorized.message,
      stack: categorized.stack,
      context: categorized.context
    });
  }
  
  return categorized;
}

/**
 * Error aggregation for monitoring
 */
class ErrorAggregator {
  private errors: Map<string, { count: number; lastOccurrence: Date; category: ErrorCategory }> = new Map();
  
  track(error: CategorizedError) {
    const key = `${error.category}:${error.message}`;
    const existing = this.errors.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
    } else {
      this.errors.set(key, {
        count: 1,
        lastOccurrence: new Date(),
        category: error.category
      });
    }
  }
  
  getStats() {
    const stats: Record<ErrorCategory, number> = {} as any;
    
    for (const [, value] of this.errors) {
      stats[value.category] = (stats[value.category] || 0) + value.count;
    }
    
    return {
      totalErrors: Array.from(this.errors.values()).reduce((sum, e) => sum + e.count, 0),
      byCategory: stats,
      topErrors: Array.from(this.errors.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([message, data]) => ({ message, ...data }))
    };
  }
  
  reset() {
    this.errors.clear();
  }
}

export const errorAggregator = new ErrorAggregator();

/**
 * Middleware for error tracking
 */
export function trackError(error: any, context?: Record<string, any>): CategorizedError {
  const categorized = handleError(error, context);
  errorAggregator.track(categorized);
  return categorized;
}
