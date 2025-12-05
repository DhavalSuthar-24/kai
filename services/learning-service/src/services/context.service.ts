import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';
import { getConfig } from '@shared/config';
import axios from 'axios';

const logger = createLogger('context-service');

export class ContextService {
  private aiServiceUrl: string;

  constructor() {
    // Should be in config, defaulting for now
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:3006';
  }

  async getContext(userId: string) {
    try {
      // 1. Fetch Active Goals & Learning State
      // 1. Fetch Active Goals & Learning State
      // Fetch from Gamification Service via API
      let goals = [];
      try {
          const gamificationUrl = process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3004';
          const response = await axios.get(`${gamificationUrl}/goals?userId=${userId}&active=true`, { timeout: 2000 });
          goals = response.data?.data || [];
      } catch (err) {
          logger.warn('Failed to fetch user goals from gamification service', { error: (err as Error).message });
          // Fallback or empty
      }

      const recentTopics = await prisma.topic.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 1
      });

      // 2. Fetch Time of Day / Schedule (Simply current time for now)
      const now = new Date();
      const hour = now.getHours();
      let timeOfDay = 'NIGHT';
      if (hour >= 6 && hour < 12) timeOfDay = 'MORNING';
      else if (hour >= 12 && hour < 17) timeOfDay = 'AFTERNOON';
      else if (hour >= 17 && hour < 21) timeOfDay = 'EVENING';

      // 3. Fetch Mental State from AI Service
      // We need recent activities for the AI model. 
      // For this MVP, we'll send a dummy list or recent screen logs if available.
      const recentLogs = await prisma.screenUsageLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 50
      });
      
      const activities = recentLogs.map(log => ({
        type: 'USAGE',
        duration: log.duration,
        category: log.category,
        timestamp: log.timestamp.toISOString()
      }));

      let mentalState = { stress_score: 5, focus_capacity: 50 }; // Default
      
      try {
        const response = await fetch(`${this.aiServiceUrl}/api/v1/psych/analyze-state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, activities })
        });
        
        if (response.ok) {
            const data = await response.json() as any;
            mentalState = {
                stress_score: data.stress_score,
                focus_capacity: data.focus_capacity
            };
        }
      } catch (err) {
        logger.warn('Failed to fetch mental state from AI service', err);
      }

      return {
        timestamp: now,
        timeOfDay,
        activeGoals: goals,
        lastTopic: recentTopics[0],
        mentalState,
        // Calculate available time? (Mock for now)
        availableTime: 30 
      };

    } catch (error) {
      logger.error('Error getting user context', error);
      throw error;
    }
  }
}
