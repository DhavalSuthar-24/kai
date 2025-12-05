import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, BadRequestError, UnauthorizedError, NotFoundError, type AuthRequest } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';
import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { createLogger } from '@shared/index.ts';
import passport from 'passport';

const logger = createLogger('auth-controller');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new BadRequestError('User already exists');
  }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    logger.info(`Attempting to create user with email: ${email}`);
    
    let user;
    try {
        user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            verificationToken,
            verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isVerified: false,
          },
        });
        logger.info(`User created in DB: ${user.id}`);
    } catch (dbError) {
        logger.error('DB Error:', dbError);
        throw dbError;
    }
    // Generate tokens
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, isVerified: false },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenHash,
      expiresAt: refreshTokenExpiry,
    },
  });

  // Create default user preferences
  await prisma.userPreferences.create({
    data: { userId: user.id }
  });

  // Publish USER_CREATED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'USER_CREATED',
        data: {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            timestamp: new Date().toISOString()
        }
    }]);

    // Publish EMAIL_VERIFICATION_REQUESTED event
    await kafkaClient.send('user-events', [{
        type: 'EMAIL_VERIFICATION_REQUESTED',
        data: {
            userId: user.id,
            email: user.email,
            token: verificationToken,
            timestamp: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish events', error);
  }

  res.status(201).json(successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified
    },
    token,
    refreshToken
  }, 'User registered successfully. Please verify your email.'));
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
    process.env.JWT_SECRET || 'super-secret-key',
    { expiresIn: '1h' }
  );

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenHash,
      expiresAt: refreshTokenExpiry,
    },
  });

  res.status(200).json(successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified
    },
    token,
    refreshToken
  }, 'Login successful'));
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.query;

  if (!token) {
    throw new BadRequestError('Verification token is required');
  }

  const user = await prisma.user.findFirst({ where: { verificationToken: String(token) } });

  if (!user) {
    throw new BadRequestError('Invalid verification token');
  }

  if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    throw new BadRequestError('Token expired. Please request a new verification email.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });

  // Publish USER_VERIFIED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'USER_VERIFIED',
        data: {
            userId: user.id,
            email: user.email,
            verifiedAt: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish USER_VERIFIED event', error);
  }

  res.status(200).json(successResponse(null, 'Email verified successfully'));
});

export const resendVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isVerified) {
    throw new BadRequestError('Email is already verified');
  }

  // Generate new token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      verificationToken,
      verificationTokenExpiry
    },
  });

  // Publish EMAIL_VERIFICATION_REQUESTED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'EMAIL_VERIFICATION_REQUESTED',
        data: {
            userId: user.id,
            email: user.email,
            token: verificationToken,
            timestamp: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish EMAIL_VERIFICATION_REQUESTED event', error);
  }

  res.status(200).json(successResponse(null, 'Verification email sent'));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.status(200).json(successResponse(null, 'If that email exists, a reset link has been sent.'));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // Publish PASSWORD_RESET_REQUESTED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'PASSWORD_RESET_REQUESTED',
        data: {
            userId: user.id,
            email: user.email,
            token: resetToken,
            timestamp: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish PASSWORD_RESET_REQUESTED event', error);
  }

  res.status(200).json(successResponse(null, 'If that email exists, a reset link has been sent.'));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new BadRequestError('Token and new password are required');
  }

  // Validate password complexity (basic check, can be enhanced)
  if (newPassword.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters long');
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  // Publish PASSWORD_RESET_COMPLETED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'PASSWORD_RESET_COMPLETED',
        data: {
            userId: user.id,
            resetAt: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish PASSWORD_RESET_COMPLETED event', error);
  }

  res.status(200).json(successResponse(null, 'Password reset successfully'));
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current and new password are required');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new BadRequestError('Invalid current password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });

  res.status(200).json(successResponse(null, 'Password changed successfully'));
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  // Soft delete user
  await prisma.user.delete({ where: { id: userId } });

  // Publish USER_DELETED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'USER_DELETED',
        data: {
            userId,
            timestamp: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish USER_DELETED event', error);
  }

  res.status(200).json(successResponse(null, 'Account deleted successfully'));
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required');
  }

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenHash },
  });

  if (!tokenRecord) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (tokenRecord.isRevoked) {
    // Token reuse detected! Potential security breach.
    // Optionally revoke all tokens for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token revoked');
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Token Rotation: Revoke old token, issue new pair
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: tokenRecord.userId } });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const newAccessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
    process.env.JWT_SECRET || 'super-secret-key',
    { expiresIn: '1h' }
  );

  const newRefreshToken = crypto.randomBytes(32).toString('hex');
  const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshTokenHash,
      expiresAt: newRefreshTokenExpiry,
    },
  });

  res.status(200).json(successResponse({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  }, 'Token refreshed successfully'));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  // Revoke all refresh tokens for the user (as per prompt instructions)
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  res.status(200).json(successResponse(null, 'Logged out successfully'));
});

export const revokeAllSessions = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  res.status(200).json(successResponse(null, 'All sessions revoked'));
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      createdAt: true,
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.status(200).json(successResponse(user));
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      updatedAt: true,
    }
  });

  res.status(200).json(successResponse(user, 'Profile updated successfully'));

  // Publish USER_UPDATED event
  try {
    await kafkaClient.send('user-events', [{
        type: 'USER_UPDATED',
        data: {
            userId: user.id,
            email: user.email,
            name: user.name,
            updatedAt: new Date().toISOString()
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish USER_UPDATED event', error);
  }
});

// OAuth Handlers
export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, async (err: any, user: any, info: any) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    
    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      process.env.JWT_SECRET || 'super-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  })(req, res, next);
};

export const githubAuth = passport.authenticate('github', { scope: ['user:email'] });

export const githubCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('github', { session: false }, async (err: any, user: any, info: any) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      process.env.JWT_SECRET || 'super-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  })(req, res, next);
};

export const adminOnlyRoute = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json(successResponse({ message: 'Welcome Admin!' }, 'Admin access granted'));
});
