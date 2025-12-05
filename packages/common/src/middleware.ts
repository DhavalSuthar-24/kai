import { type Request, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import { AppError } from './errors.ts';
import { createLogger } from './logger.ts';
import { errorResponse } from './response.ts';
import { getConfig } from './config.ts';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { z, type ZodSchema } from 'zod';
import { randomUUID } from 'crypto';

const logger = createLogger('middleware');

// Correlation ID middleware
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
  (req as any).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

// Error handler with correlation ID
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const correlationId = (req as any).correlationId;
  logger.error(err.message, { 
    stack: err.stack,
    correlationId,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message));
    return;
  }

  res.status(500).json(errorResponse('Internal Server Error'));
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Enhanced auth request interface
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
  correlationId?: string;
}

// JWT validation middleware with proper environment variable
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json(errorResponse('Unauthorized: No token provided'));
  }

  try {
    const config = getConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    (req as AuthRequest).user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role || 'USER',
      isVerified: decoded.isVerified || false,
    };
    next();
  } catch (error) {
    logger.warn('Invalid JWT token', { error: (error as Error).message, correlationId: (req as AuthRequest).correlationId });
    return res.status(401).json(errorResponse('Unauthorized: Invalid token'));
  }
};

export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json(errorResponse('Unauthorized: User not authenticated'));
  }

  if (!authReq.user.isVerified) {
    return res.status(403).json(errorResponse('Forbidden: Email verification required'));
  }

  next();
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json(errorResponse('Unauthorized: User not authenticated'));
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json(errorResponse('Forbidden: Insufficient permissions'));
    }

    next();
  };
};

// Rate limiting middleware factory
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  const config = getConfig();
  
  return rateLimit({
    windowMs: options?.windowMs || config.RATE_LIMIT_WINDOW_MS,
    max: options?.max || config.RATE_LIMIT_MAX_REQUESTS,
    message: options?.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        correlationId: (req as any).correlationId,
      });
      res.status(429).json(errorResponse(options?.message || 'Too many requests, please try again later'));
    },
  });
};

// Input validation middleware factory
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        logger.warn('Validation failed', { 
          errors, 
          correlationId: (req as any).correlationId,
          path: req.path,
        });
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
      next(error);
    }
  };
};

// CORS configuration
export const createCorsMiddleware = () => {
  const config = getConfig();
  
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (config.ALLOWED_ORIGINS.includes(origin) || config.ALLOWED_ORIGINS.includes('*')) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });
};

// Helmet security headers
export const createHelmetMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
};

// Pagination middleware
export interface PaginationRequest extends Request {
  pagination: {
    page: number;
    limit: number;
    skip: number;
  };
}

export const paginationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  (req as any).pagination = {
    page,
    limit,
    skip,
  };

  next();
};
