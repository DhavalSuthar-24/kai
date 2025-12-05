import type { Request, Response } from 'express';
import { ContentRecommendationService } from '../services/recommendation.service';
import { successResponse, errorResponse } from '@shared/index.ts';

const service = new ContentRecommendationService();

export class RecommendationController {
  async recommend(req: Request, res: Response) {
    try {
      const { userContext } = req.body;
      if (!userContext) {
        res.status(400).json(errorResponse('Missing userContext'));
        return;
      }
      const recommendation = await service.recommendContent(userContext);
      res.json(successResponse(recommendation));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }
}
