import type { Response } from 'express';
import { type AuthRequest, successResponse, asyncHandler, friendRequestSchema } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  getPendingRequests,
  removeFriend
} from '../services/friend.service.ts';

export const requestFriend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { friendEmail } = friendRequestSchema.parse(req.body);

  const friendship = await sendFriendRequest(userId, friendEmail);

  // Publish FRIEND_REQUEST_SENT event
  try {
    await kafkaClient.send('friend-events', [{
      type: 'FRIEND_REQUEST_SENT',
      data: {
        friendshipId: friendship.id,
        senderId: userId,
        receiverId: friendship.friendId,
        timestamp: new Date().toISOString()
      }
    }]);
  } catch (error) {
    console.error('Failed to publish FRIEND_REQUEST_SENT event', error);
  }

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

  // Publish FRIEND_REQUEST_ACCEPTED event
  try {
    await kafkaClient.send('friend-events', [{
      type: 'FRIEND_REQUEST_ACCEPTED',
      data: {
        friendshipId: friendship.id,
        senderId: friendship.userId,
        receiverId: friendship.friendId,
        timestamp: new Date().toISOString()
      }
    }]);
  } catch (error) {
    console.error('Failed to publish FRIEND_REQUEST_ACCEPTED event', error);
  }

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
