import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('challenge-service');

export class ChallengeService {
  
  async createChallenge(userId: string, data: any) {
    try {
      logger.info(`Creating challenge for user ${userId}`, data);
      
      const challenge = await prisma.challenge.create({
        data: {
          creatorId: userId,
          title: data.title,
          description: data.description,
          type: data.type,
          target: data.target,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isPublic: data.isPublic || false
        }
      });

      // Auto-join creator
      await this.joinChallenge(userId, challenge.id);

      return challenge;
    } catch (error) {
      logger.error('Error creating challenge', error);
      throw error;
    }
  }

  async joinChallenge(userId: string, challengeId: string) {
    try {
      // Check if already joined
      const existing = await prisma.challengeParticipant.findUnique({
        where: {
          challengeId_userId: {
            challengeId,
            userId
          }
        }
      });

      if (existing) return existing;

      return await prisma.challengeParticipant.create({
        data: {
          challengeId,
          userId
        }
      });
    } catch (error) {
      logger.error('Error joining challenge', error);
      throw error;
    }
  }

  async updateProgress(userId: string, type: string, amount: number = 1) {
    try {
      // Find active challenges for this user of this type
      const participants = await prisma.challengeParticipant.findMany({
        where: {
          userId,
          completed: false,
          challenge: {
            type,
            status: 'ACTIVE',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        },
        include: { challenge: true }
      });

      for (const p of participants) {
        const newProgress = p.progress + amount;
        const isCompleted = newProgress >= p.challenge.target;

        await prisma.challengeParticipant.update({
          where: { id: p.id },
          data: {
            progress: newProgress,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null
          }
        });

        if (isCompleted) {
          logger.info(`User ${userId} completed challenge ${p.challenge.id}`);
          // TODO: Award points/badge
        }
      }
    } catch (error) {
      logger.error('Error updating challenge progress', error);
    }
  }

  async getChallenges(userId: string) {
    // Get public active challenges
    return await prisma.challenge.findMany({
      where: {
        isPublic: true,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUserChallenges(userId: string) {
    return await prisma.challengeParticipant.findMany({
      where: { userId },
      include: { challenge: true },
      orderBy: { joinedAt: 'desc' }
    });
  }
}

export const challengeService = new ChallengeService();
