import type { Response } from 'express';
import type { AuthRequest } from '@shared/index';
import { successResponse } from '@shared/index';
import { asyncHandler } from '@shared/index';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  getPendingRequests,
  removeFriend
} from '../services/friend.service';

export const requestFriend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { friendEmail } = req.body;

  const friendship = await sendFriendRequest(userId, friendEmail);

  res.json(successResponse(friendship, 'Friend request sent'));
});

export const acceptRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { friendshipId } = req.params;
  if (!friendshipId) {
    res.status(400).json({ error: 'Missing friendshipId parameter' });
    return;
  }

  const friendship = await acceptFriendRequest(friendshipId, userId);

  res.json(successResponse(friendship, 'Friend request accepted'));
});

export const rejectRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { friendshipId } = req.params;
  if (!friendshipId) {
    res.status(400).json({ error: 'Missing friendshipId parameter' });
    return;
  }

  await rejectFriendRequest(friendshipId, userId);

  res.json(successResponse(null, 'Friend request rejected'));
});

export const listFriends = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const friends = await getFriendsList(userId);

  res.json(successResponse(friends, 'Friends list retrieved'));
});

export const listPendingRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const requests = await getPendingRequests(userId);

  res.json(successResponse(requests, 'Pending requests retrieved'));
});

export const deleteFriend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { friendId } = req.params;
  if (!friendId) {
    res.status(400).json({ error: 'Missing friendId parameter' });
    return;
  }

  await removeFriend(userId, friendId);

  res.json(successResponse(null, 'Friend removed'));
});
