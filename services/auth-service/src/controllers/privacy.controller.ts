import { type Request, type Response } from 'express';
import { PrivacyService } from '../services/privacy.service';
import { errorResponse } from '@shared/index.ts';

export class PrivacyController {
    private service: PrivacyService;

    constructor() {
        this.service = new PrivacyService();
    }

    updateKey = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const { publicKey } = req.body;
            
            const result = await this.service.storePublicKey(userId, publicKey);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to update public key', error));
        }
    };

    deleteAccount = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            
            const result = await this.service.initiateDeletion(userId);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to initiate account deletion', error));
        }
    };
}
