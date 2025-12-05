import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { createLogger } from '@shared/index.ts';
import prisma from '../prisma.ts';

const logger = createLogger('leaderboard-socket');

let io: SocketServer | null = null;

export function initializeLeaderboardSocket(httpServer: HTTPServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*', // Configure appropriately for production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected to leaderboard socket: ${socket.id}`);

    // Subscribe to specific leaderboard updates
    socket.on('leaderboard:subscribe', async (data: { type: 'GLOBAL' | 'FRIENDS', userId?: string }) => {
      const room = data.type === 'GLOBAL' ? 'leaderboard:global' : `leaderboard:friends:${data.userId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room ${room}`);

      // Send initial data
      if (data.type === 'GLOBAL') {
        const globalLeaderboard = await getGlobalLeaderboard();
        socket.emit('leaderboard:update', { type: 'GLOBAL', data: globalLeaderboard });
      } else if (data.type === 'FRIENDS' && data.userId) {
        const friendLeaderboard = await getFriendLeaderboard(data.userId);
        socket.emit('leaderboard:update', { type: 'FRIENDS', data: friendLeaderboard });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected from leaderboard socket: ${socket.id}`);
    });
  });

  logger.info('Leaderboard WebSocket server initialized');
  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

import { leaderboardService } from '../services/leaderboard.service.ts';

// Helper to fetch global leaderboard
async function getGlobalLeaderboard() {
  return await leaderboardService.getGlobalLeaderboard(10);
}

async function getFriendLeaderboard(userId: string) {
  // 1. Get friend IDs
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: userId, status: 'ACCEPTED' },
        { friendId: userId, status: 'ACCEPTED' }
      ]
    }
  });

  const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
  friendIds.push(userId); // Include self

  // 2. Get progress for friends + self
  const leaderboard = await prisma.userProgress.findMany({
    where: {
      userId: { in: friendIds }
    },
    orderBy: { points: 'desc' },
    take: 20,
    select: {
      userId: true,
      points: true,
      level: true,
      streak: true
    }
  });

  return leaderboard;
}

export function emitLeaderboardUpdate(type: 'GLOBAL' | 'FRIENDS', data: any, userId?: string) {
  if (!io) return;

  if (type === 'GLOBAL') {
    io.to('leaderboard:global').emit('leaderboard:update', { type: 'GLOBAL', data });
  } else if (type === 'FRIENDS' && userId) {
    // For friends, we might need to emit to specific user rooms or a shared friend room
    // For simplicity, let's assume we emit to the user's friend room which their friends are subscribed to?
    // Or rather, when a user updates, we need to notify all their friends.
    // This is complex. For now, let's focus on Global Leaderboard updates.
  }
}
