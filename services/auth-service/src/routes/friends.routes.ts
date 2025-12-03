import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import {
  requestFriend,
  acceptRequest,
  rejectRequest,
  listFriends,
  listPendingRequests,
  deleteFriend
} from '../controllers/friends.controller';

const router = Router();

router.post('/request', authMiddleware, requestFriend);
router.post('/accept/:friendshipId', authMiddleware, acceptRequest);
router.post('/reject/:friendshipId', authMiddleware, rejectRequest);
router.get('/list', authMiddleware, listFriends);
router.get('/pending', authMiddleware, listPendingRequests);
router.delete('/:friendId', authMiddleware, deleteFriend);

export default router;
