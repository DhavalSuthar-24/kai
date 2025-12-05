import type { Request, Response } from 'express';
import { DeepDiveService } from '../services/deep-dive.service';
import { errorResponse, successResponse } from '@shared/index.ts';

const service = new DeepDiveService();

export class DeepDiveController {
    async ask(req: Request, res: Response) {
        try {
            const { userId } = (req as any).user;
            const { documentId, query } = req.body;
            
            if (!documentId || !query) {
                return res.status(400).json(errorResponse('Missing documentId or query'));
            }
            
            const result = await service.answerQuestion(userId, documentId, query);
            
            res.json(successResponse(result));
        } catch (error: any) {
            res.status(500).json(errorResponse(error.message));
        }
    }
}
