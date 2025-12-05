import { type Request, type Response } from 'express';
import { MarketplaceService } from '../services/marketplace.service';
import { errorResponse } from '@shared/index.ts';

export class MarketplaceController {
    private service: MarketplaceService;

    constructor() {
        this.service = new MarketplaceService();
    }

    publish = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const { name, description, topics, content } = req.body;
            
            const result = await this.service.publishStudyPack({
                userId, name, description, topics, content
            });
            
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to publish pack', error));
        }
    };

    purchase = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const { packId } = req.params;
            
            const result = await this.service.purchasePack(userId, packId);
            
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to purchase pack', error));
        }
    };

    getFeed = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const filters = req.query;
            
            const result = await this.service.getFeed(userId, filters);
            
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to fetch marketplace feed', error));
        }
    };
}
