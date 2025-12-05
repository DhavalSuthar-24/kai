import { type Request, type Response } from 'express';
import { OfflineSyncService } from '../services/offline-sync.service.ts';
import { DataExportService } from '../services/data-export.service.ts';
import { errorResponse } from '@shared/index.ts';

export class OfflineController {
    private syncService: OfflineSyncService;
    private exportService: DataExportService;

    constructor() {
        this.syncService = new OfflineSyncService();
        this.exportService = new DataExportService();
    }

    prefetch = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const data = await this.syncService.prefetchContent(userId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to prefetch content', error));
        }
    };

    sync = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const { changeset } = req.body;
            const result = await this.syncService.syncWhenOnline(userId, changeset || []);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to sync content', error));
        }
    };

    exportData = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const data = await this.exportService.exportUserData(userId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to export data', error));
        }
    };

    deleteData = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            // Additional confirmation logic would go here in prod
            const result = await this.exportService.deleteUserData(userId);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json(errorResponse('Failed to delete data', error));
        }
    };
}
