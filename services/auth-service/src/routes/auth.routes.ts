import { Router } from 'express';
import { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, changePassword, refreshAccessToken, logout, revokeAllSessions, deleteAccount, getMe, updateProfile, googleAuth, googleCallback, githubAuth, githubCallback, adminOnlyRoute } from '../controllers/auth.controller.ts';
import { validateRequest, registerSchema, loginSchema, authMiddleware, createRateLimiter, requireRole } from '@shared/index.ts';

const router = Router();

const sensitiveRouteLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many requests, please try again later'
});

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.get('/verify', verifyEmail);
router.post('/resend-verification', sensitiveRouteLimiter, resendVerification);
router.post('/forgot-password', sensitiveRouteLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.post('/refresh', refreshAccessToken);
router.post('/logout', authMiddleware, logout);
router.post('/revoke-all-sessions', authMiddleware, revokeAllSessions);
router.delete('/delete-account', authMiddleware, deleteAccount);

router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);

// OAuth Routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

// Admin Route
router.get('/admin', authMiddleware, requireRole(['ADMIN']), adminOnlyRoute);

export default router;
