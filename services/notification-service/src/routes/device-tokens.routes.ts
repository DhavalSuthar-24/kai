import { Router, type IRouter } from 'express';
import {
  registerToken,
  unregisterToken,
  getUserTokens,
  getTokenStats,
} from '../controllers/device-tokens.controller.ts';

const router: IRouter = Router();

// Register a device token
router.post('/', registerToken);

// Unregister a device token
router.delete('/:token', unregisterToken);

// Get user's device tokens
router.get('/:userId', getUserTokens);

// Get token statistics
router.get('/:userId/stats', getTokenStats);

export default router;
