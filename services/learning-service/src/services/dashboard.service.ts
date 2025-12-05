import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('dashboard-service');

export class DashboardService {
  async getScreenTimeAnalytics(userId: string, timeRange: string = '7d') {
    try {
        let interval = '7 days';
        if (timeRange === '30d') interval = '30 days';
        if (timeRange === '24h') interval = '24 hours';

        // 1. Fetch Hourly Usage Trends (from TimescaleDB Materialized View)
        // Using raw query as View is not in Prisma Schema directly or we interact via SQL
        const trends = await prisma.$queryRaw`
            SELECT 
                hour as timestamp,
                SUM(total_duration) as "totalDuration",
                SUM(session_count) as "sessionCount"
            FROM "hourly_usage_patterns"
            WHERE "userId" = ${userId}
            AND hour > NOW() - ${interval}::INTERVAL
            GROUP BY hour
            ORDER BY hour ASC
        `;

        // 2. Fetch App Breakdown
        const breakdown = await prisma.$queryRaw`
            SELECT 
                "appPackageName",
                SUM(total_duration) as "totalDuration"
            FROM "hourly_usage_patterns"
            WHERE "userId" = ${userId}
            AND hour > NOW() - ${interval}::INTERVAL
            GROUP BY "appPackageName"
            ORDER BY "totalDuration" DESC
            LIMIT 10
        `;

        // 3. Fetch Focus/Stress Scores (aggregated from Psych State logic if stored, 
        // or just Mock/Real-time for now. Let's assume we store them in ScreenTimeEvent or separate table.
        // For MVP, we will aggregate from ScreenTimeEvent where we might have stored analysis result,
        // OR simply return a mock series for the graph functionality).
        // Real implementation would join with a PsychState table.
        // We will generate a mock trend for Focus Score to verify UI integration.
        const focusScores = await this.mockFocusTrend(interval);

        return {
            trends,
            breakdown,
            focusScores
        };

    } catch (error) {
        logger.error('Error fetching dashboard analytics', error);
        throw error;
    }
  }

  private async mockFocusTrend(range: string) {
      // Generate some dummy data points matching the range
      const days = range === '24 hours' ? 24 : 7;
      const data = [];
      const now = new Date();
      for (let i = 0; i < days; i++) {
        const d = new Date(now);
        if (range === '24 hours') d.setHours(d.getHours() - i);
        else d.setDate(d.getDate() - i);
        
        data.push({
            timestamp: d,
            score: Math.floor(Math.random() * 40) + 60 // 60-100
        });
      }
      return data.reverse();
  }
}
