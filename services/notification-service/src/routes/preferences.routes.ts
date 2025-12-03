import { Router, type IRouter } from 'express';
import {
  getPreferences,
  updatePreferences,
  unsubscribeAll,
} from '../controllers/preferences.controller.ts';

const router: IRouter = Router();

// Get user preferences
router.get('/:userId', getPreferences);

// Update user preferences
router.put('/:userId', updatePreferences);

// Unsubscribe from all notifications
router.post('/:userId/unsubscribe', unsubscribeAll);

export default router;
