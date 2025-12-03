import { prisma } from '../prisma';
import { createLogger } from '@shared/index';

const logger = createLogger('friend-service');

export async function sendFriendRequest(userId: string, friendEmail: string) {
  logger.info(`Friend request from ${userId} to ${friendEmail}`);

  // Find friend by email
  const friend = await prisma.user.findUnique({
    where: { email: friendEmail }
  });

  if (!friend) {
    throw new Error('User not found');
  }

  if (friend.id === userId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if friendship already exists
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: friend.id },
        { userId: friend.id, friendId: userId }
      ]
    }
  });

  if (existing) {
    throw new Error('Friend request already exists');
  }

  const friendship = await prisma.friendship.create({
    data: {
      userId,
      friendId: friend.id,
      status: 'PENDING'
    }
  });

  return friendship;
}

export async function acceptFriendRequest(friendshipId: string, userId: string) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId }
  });

  if (!friendship) {
    throw new Error('Friend request not found');
  }

  if (friendship.friendId !== userId) {
    throw new Error('Not authorized to accept this request');
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'ACCEPTED' }
  });

  return updated;
}

export async function rejectFriendRequest(friendshipId: string, userId: string) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId }
  });

  if (!friendship) {
    throw new Error('Friend request not found');
  }

  if (friendship.friendId !== userId) {
    throw new Error('Not authorized to reject this request');
  }

  await prisma.friendship.delete({
    where: { id: friendshipId }
  });
}

export async function getFriendsList(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId, status: 'ACCEPTED' },
        { friendId: userId, status: 'ACCEPTED' }
      ]
    }
  });

  // Get friend IDs
  const friendIds = friendships.map(f => 
    f.userId === userId ? f.friendId : f.userId
  );

  // Get friend details
  const friends = await prisma.user.findMany({
    where: {
      id: { in: friendIds }
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  return friends;
}

export async function getPendingRequests(userId: string) {
  const requests = await prisma.friendship.findMany({
    where: {
      friendId: userId,
      status: 'PENDING'
    }
  });

  // Get sender details
  const senderIds = requests.map(r => r.userId);
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, email: true }
  });

  return requests.map(r => ({
    ...r,
    sender: senders.find(s => s.id === r.userId)
  }));
}

export async function removeFriend(userId: string, friendId: string) {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    }
  });
}
