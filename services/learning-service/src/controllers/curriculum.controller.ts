import type { Request, Response } from 'express';
import { CurriculumService } from '../services/curriculum.service';
import { successResponse, errorResponse } from '@shared/index.ts';

const curriculumService = new CurriculumService();

export class CurriculumController {
    async generate(req: Request, res: Response) {
        try {
            const { subject, examName, userLevel } = req.body;
            const userId = (req as any).user!.id;

            const result = await curriculumService.generateCurriculum({
                userId,
                subject,
                examName,
                userLevel
            });

            res.json(successResponse(result));
        } catch (error: any) {
            res.status(500).json(errorResponse(error.message));
        }
    }
}
