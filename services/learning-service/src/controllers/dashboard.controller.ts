import type { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { successResponse, errorResponse } from '@shared/index.ts';

const dashboardService = new DashboardService();

export class DashboardController {
  async getAnalytics(req: Request, res: Response) {
    try {
      const { timeRange } = req.query;
      const userId = (req as any).user!.id;

      const analytics = await dashboardService.getScreenTimeAnalytics(
        userId, 
        timeRange as string || '7d'
      );

      res.json(successResponse(analytics));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }
}
